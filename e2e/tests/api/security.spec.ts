import { test, expect } from '@playwright/test';
import { anonymous, createAdminSession, loginUser, USERS, STRAPI, type Api } from '../../helpers/api';
import { SOLUTIONS, SUM_TESTS, World, submitAndWait } from '../../helpers/world';

type Session = Awaited<ReturnType<typeof loginUser>>;

test.describe('security, least privilege and multi-user isolation', () => {
  let world: World;
  let dispose: () => Promise<void>;
  let student: Session, alice: Session, mallory: Session;
  let eventId: string, problemId: string, languageId: string;
  let studentSubmissionId: string;

  test.beforeAll(async () => {
    const admin = await createAdminSession();
    dispose = admin.dispose;
    world = new World(admin.api);
    [student, alice, mallory] = await Promise.all([loginUser('student'), loginUser('alice'), loginUser('mallory')]);

    languageId = await world.language();
    eventId = await world.liveEvent('security', languageId);
    problemId = await world.problem({ title: 'Sum (security)', eventId, tests: SUM_TESTS });
    await world.register('student', eventId);
    await world.register('alice', eventId);

    const result = await submitAndWait(student.api, problemId, languageId, SOLUTIONS.sum);
    studentSubmissionId = result.id;
  });

  test.afterAll(async () => {
    await world.dispose();
    await dispose();
  });

  test.describe('hidden and locked test cases', () => {
    test('problem endpoint shows the sample only and drops locked tests', async () => {
      const res = await student.api.get(`/api/problems/${problemId}?populate=*`);
      expect(res.status).toBe(200);
      const tests = res.body.data.testCases as any[];
      expect(tests).toHaveLength(2); // visible + hidden, locked is dropped
      const visible = tests.filter((t) => !t.hidden);
      const hidden = tests.filter((t) => t.hidden);
      expect(visible).toHaveLength(1);
      expect(visible[0].input).toBe('1 2\n');
      expect(hidden).toHaveLength(1);
      expect(hidden[0].input ?? null).toBeNull();
      expect(hidden[0].output ?? null).toBeNull();
      expect(res.text).not.toContain('100 200');
      expect(res.text).not.toContain('"30\\n"');
    });

    test('GET /api/test-cases does not leak hidden or locked data', async () => {
      const res = await student.api.get('/api/test-cases?pagination[pageSize]=100&populate=problem');
      expect(res.status).toBe(200);
      for (const tc of res.body.data) {
        expect(tc.locked).not.toBe(true);
        if (tc.hidden) {
          expect(tc.input ?? null).toBeNull();
          expect(tc.output ?? null).toBeNull();
        }
      }
      expect(res.text).not.toContain('100 200');
    });

    test('execution results of hidden tests carry no stdout, input or expected output', async () => {
      const ex = await student.api.get(`/api/executions?filters[submission][documentId][$eq]=${studentSubmissionId}&populate[testCase]=true`);
      const hiddenRows = ex.body.data.filter((e: any) => e.testCase?.hidden);
      expect(hiddenRows.length).toBeGreaterThan(0);
      for (const row of hiddenRows) {
        expect(row.stdout).toBe('');
        expect(row.stderr).toBe('');
        expect(row.testCase.input ?? null).toBeNull();
        expect(row.testCase.output ?? null).toBeNull();
      }
      expect(ex.body.data.some((e: any) => e.testCase?.locked)).toBe(false);
    });

    test('a participant program cannot read the hidden test inputs of its own submission', async () => {
      const snoop = [
        '#include <iostream>',
        '#include <fstream>',
        '#include <filesystem>',
        'namespace fs = std::filesystem;',
        'int main(){try{for(auto&e:fs::directory_iterator("/exc/input")){std::ifstream in(e.path());std::string line;while(std::getline(in,line))std::cout<<"LEAK:"<<line<<"\\n";}}catch(...){std::cout<<"blocked\\n";}}',
      ].join('\n');
      const run = await submitAndWait(student.api, problemId, languageId, snoop);
      for (const e of run.executions) {
        expect(e.stdout).not.toContain('LEAK');
      }
      const visible = run.executions.find((e) => !e.testCase?.hidden);
      expect(visible.stdout).toContain('blocked');
    });

    test('GraphQL is not exposed (it would bypass the REST sanitizers)', async () => {
      const res = await student.api.post('/graphql', { query: '{ testCases { input output hidden locked } }' });
      expect([400, 404, 405]).toContain(res.status);
      const body = JSON.stringify(res.body ?? {});
      expect(body).not.toContain('"input"');
    });

    test('judge-side sources are never part of problem responses', async () => {
      const res = await student.api.get(`/api/problems/${problemId}?populate=*`);
      expect(res.body.data.interactorSource ?? null).toBeNull();
      expect(res.body.data.checkerSource ?? null).toBeNull();
    });
  });

  test.describe('other participants', () => {
    test('cannot list or open a participant’s submission', async () => {
      const list = await alice.api.get(`/api/submissions?filters[problem][documentId][$eq]=${problemId}`);
      expect(list.body.data).toHaveLength(0);
      expect((await alice.api.get(`/api/submissions/${studentSubmissionId}`)).status).toBe(404);
    });

    test('cannot read or re-run another participant’s executions', async () => {
      const res = await alice.api.get(`/api/executions?filters[submission][documentId][$eq]=${studentSubmissionId}&populate[testCase]=true`);
      expect(res.body?.data ?? []).toHaveLength(0);
      expect((await alice.api.get('/api/executions')).status).toBe(403); // submission filter is mandatory
      expect([403, 404]).toContain((await alice.api.get(`/api/submissions/submit?id=${studentSubmissionId}`)).status);
    });

    test('cannot read or modify another user’s account', async () => {
      expect([403, 404]).toContain((await alice.api.get(`/api/users/${student.id}`)).status);
      expect([403, 404]).toContain((await alice.api.put(`/api/users/${student.id}`, { username: 'hacked' })).status);
      expect((await alice.api.get('/api/users')).status).toBe(403);
      const self = await alice.api.get('/api/users/me');
      expect(self.body.email).toBe(USERS.alice.email);
    });

    test('can still update their own profile', async () => {
      const res = await alice.api.put(`/api/users/${alice.id}`, { username: 'alice' });
      expect(res.status).toBe(200);
    });
  });

  test.describe('outsiders', () => {
    test('an unregistered user cannot open, list or submit', async () => {
      expect((await mallory.api.get(`/api/problems/${problemId}`)).status).toBe(403);
      const list = await mallory.api.get(`/api/problems?filters[event][documentId][$eq]=${eventId}`);
      expect(list.body?.data ?? []).toHaveLength(0);
      const attempt = await submitAndWait(mallory.api, problemId, languageId, SOLUTIONS.sum);
      expect(attempt.createStatus).toBe(403);
    });

    test('anonymous requests are refused', async () => {
      const anon: Api = await anonymous();
      for (const path of ['/api/submissions', '/api/executions', `/api/problems/${problemId}`, '/api/test-cases', '/api/event-registrations', '/api/training', '/api/events/training-leaderboard']) {
        expect([401, 403], path).toContain((await anon.get(path)).status);
      }
      expect([401, 403]).toContain((await anon.get(`/api/events/${eventId}/leaderboard`)).status);
    });

    test('an event that has not started exposes neither problems nor their statements', async () => {
      const futureProblem = await world.problem({ title: 'Future secret', tests: SUM_TESTS });
      const futureEvent = await world.event({ title: 'future', start: Date.now() + 86_400_000, end: Date.now() + 2 * 86_400_000, languageId });
      await world.admin.put(`/api/problems/${futureProblem}`, { data: { event: futureEvent } });
      await world.register('alice', futureEvent);

      const ev = await alice.api.get(`/api/events/${futureEvent}?populate[problems]=true`);
      expect(ev.body.data.problems ?? []).toHaveLength(0);
      const list = await alice.api.get(`/api/problems?filters[event][documentId][$eq]=${futureEvent}`);
      expect(list.body.data).toHaveLength(0);
      expect((await alice.api.get(`/api/problems/${futureProblem}`)).status).toBe(403);
      const attempt = await submitAndWait(alice.api, futureProblem, languageId, SOLUTIONS.sum);
      expect(attempt.createStatus).toBe(403);
    });
  });

  test('training problems carry no judge-side sources', async () => {
    const res = await student.api.get('/api/training');
    expect(res.status).toBe(200);
    for (const p of res.body) {
      expect(p.interactorSource ?? null).toBeNull();
      expect(p.checkerSource ?? null).toBeNull();
    }
  });

  test.describe('personal data in shared responses', () => {
    const noPersonalData = (text: string) => {
      expect(text).not.toMatch(/@colosseum\.local/);
      expect(text).not.toMatch(/"email"/);
    };

    test('event leaderboard exposes no emails and only whitelisted user fields', async () => {
      const res = await alice.api.get(`/api/events/${eventId}/leaderboard`);
      expect(res.status).toBe(200);
      noPersonalData(res.text);
      const rows = res.body.leaderboard ?? res.body.rows ?? [];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(Object.keys(row.user).sort()).toEqual(['displayName', 'documentId', 'username']);
      }
    });

    test('training leaderboard, questions and registrations expose no emails', async () => {
      for (const path of ['/api/events/training-leaderboard', `/api/events/${eventId}/questions`, `/api/event-registrations?populate=user`, '/api/submissions?populate=user']) {
        const res = await alice.api.get(path);
        expect(res.status, path).toBe(200);
        // Own account details may appear in own records; other users' must not
        expect(res.text.replace(/alice@colosseum\.local/g, ''), path).not.toMatch(/@colosseum\.local/);
      }
    });

    test('registrations list only the caller’s own registrations', async () => {
      const res = await alice.api.get('/api/event-registrations?populate=user&pagination[pageSize]=100');
      for (const row of res.body.data) {
        expect(row.user?.documentId ?? alice.documentId).toBe(alice.documentId);
      }
    });
  });

  test('unauthenticated login attempt with a wrong password is refused', async () => {
    const anon = await anonymous();
    const res = await anon.post('/api/auth/local', { identifier: USERS.alice.email, password: 'wrong' });
    expect(res.status).toBe(400);
  });

  test('the API base answers', async () => {
    const res = await (await anonymous()).get('/api/events');
    expect([401, 403]).toContain(res.status);
    expect(STRAPI).toContain('http');
  });
});
