#!/usr/bin/env node
/**
 * Security + grading smoke test against a running, seeded stack.
 * Usage: node scripts/verify-seed.mjs   (STRAPI_URL optional)
 */
const API = (process.env.STRAPI_URL || 'http://localhost:1337') + '/api';
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) failed++; };

const j = async (path, { token, ...opts } = {}) => {
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
  });
  let body = null; try { body = await res.json(); } catch {}
  return { status: res.status, body };
};
const login = async (u, p) => (await j('/auth/local', { method: 'POST', body: JSON.stringify({ identifier: u, password: p }) })).body.jwt;

const tokens = {
  student: await login('student@colosseum.local', 'Student123!'),
  alice: await login('alice@colosseum.local', 'Alice123!'),
  mallory: await login('mallory@colosseum.local', 'Mallory123!'),
};
check('logins work', Object.values(tokens).every(Boolean));

const events = (await j('/events?pagination[pageSize]=50&sort=start:asc', { token: tokens.student })).body.data;
const now = Date.now();
const live = events.find((e) => new Date(e.start) <= now && new Date(e.end) >= now);
const upcoming = events.find((e) => new Date(e.start) > now);
const ended = events.find((e) => new Date(e.end) < now);
console.log('events:', events.map((e) => `${e.title.slice(0, 40)} ${e.start.slice(0, 10)}`));
if (!live) { console.log('No live event (seed with a past SEED_FIRST_EVENT_START to test submissions)'); process.exit(1); }

const problems = (await j(`/events/${live.documentId}?populate[problems][fields][0]=title&populate[problems][fields][1]=documentId`, { token: tokens.student })).body.data.problems;
const prob = problems.find((p) => /Function toolbox/i.test(p.title)) || problems[0];
const detail = (await j(`/problems/${prob.documentId}?populate=*`, { token: tokens.student })).body.data;
check('participant sees only the sample test case content', detail.testCases.length >= 1 && detail.testCases.filter((t) => t.input != null).length === 1, `(testCases returned: ${detail.testCases.length})`);
check('locked test cases are not returned at all', detail.testCases.length === 2, '(locked case dropped)');
{ const tc = (await j('/test-cases?pagination[pageSize]=500', { token: tokens.student })).body.data || []; check('GET /test-cases leaks no hidden or locked data', tc.length > 0 && tc.every((t) => !t.locked && (!t.hidden || (t.input == null && t.output == null))), `(returned ${tc.length})`); }
check('anonymous cannot read problem', [401, 403].includes((await j(`/problems/${prob.documentId}`)).status));

const lang = (await j('/languages', { token: tokens.student })).body.data[0];
const submit = async (token, problemId, code) => {
  const c = await j('/submissions', { method: 'POST', token, body: JSON.stringify({ data: { problem: problemId, code, language: lang.documentId } }) });
  if (c.status !== 200) return { create: c };
  const s = await j(`/submissions/submit?id=${c.body.data.documentId}`, { token });
  return { create: c, submit: s, id: c.body.data.documentId };
};

check('unregistered user is blocked from submitting', (await submit(tokens.mallory, prob.documentId, 'int main(){}')).create.status === 403);
if (upcoming) {
  const up = (await j(`/events/${upcoming.documentId}?populate[problems][fields][0]=documentId`, { token: tokens.student })).body.data;
  check('upcoming event hides its problem list', (up.problems || []).length === 0);
  const list = await j(`/problems?filters[event][documentId][$eq]=${upcoming.documentId}`, { token: tokens.student });
  const leaked = list.body?.data || [];
  check('GET /problems does not leak problems of an upcoming event', list.status !== 200 || leaked.length === 0, `(status ${list.status}, returned ${leaked.length})`);
  if (leaked.length) {
    const direct = await j(`/problems/${leaked[0].documentId}`, { token: tokens.student });
    check('direct GET /problems/:id of upcoming event is forbidden', direct.status === 403, `(status ${direct.status})`);
    check('cannot submit to an event that has not started', (await submit(tokens.student, leaked[0].documentId, 'int main(){}')).create.status === 403);
  }
}

const code = process.env.SOLUTION_FILE ? (await import('node:fs')).readFileSync(process.env.SOLUTION_FILE, 'utf8') : null;
if (code) {
  const r = await submit(tokens.student, prob.documentId, code);
  check('student submission accepted for queueing', !!r.id, JSON.stringify(r.create.body).slice(0, 120));
  let results;
  for (let i = 0; i < 60; i++) {
    await new Promise((r2) => setTimeout(r2, 2000));
    const ex = (await j(`/executions?filters[submission][documentId][$eq]=${r.id}&populate[testCase]=true`, { token: tokens.student })).body.data;
    if (ex.length && ex.every((e) => e.processed)) { results = ex; break; }
  }
  check('executions processed', !!results);
  if (results) {
    check('correct solution passes every visible execution', results.every((e) => e.passed), `(${results.filter((e) => e.passed).length}/${results.length})`);
    check('hidden test input/output is stripped from executions', results.filter((e) => e.testCase?.hidden).every((e) => e.testCase.input == null && e.testCase.output == null && !e.stdout));
  }
  const subs = (await j(`/submissions?filters[problem][documentId][$eq]=${prob.documentId}`, { token: tokens.alice })).body.data;
  check("other participants cannot list someone else's submission", !subs.some((s) => s.documentId === r.id));
  check("other participants cannot open someone else's submission", [403, 404].includes((await j(`/submissions/${r.id}`, { token: tokens.alice })).status));

  const lb = await j(`/events/${live.documentId}/leaderboard`, { token: tokens.alice });
  console.log('leaderboard:', JSON.stringify(lb.body).slice(0, 400));
}
process.exit(failed ? 1 : 0);
