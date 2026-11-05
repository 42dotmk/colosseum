/**
 * Removes data left behind by interrupted e2e runs (events titled "E2E ...", their problems and test cases,
 * languages created by the suite). Usage: npm run cleanup   (uses one admin login)
 */
import { request } from '@playwright/test';

const STRAPI = process.env.STRAPI_URL ?? 'http://localhost:1337';

const ctx = await request.newContext();
const login = await ctx.post(`${STRAPI}/admin/login`, {
  data: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@colosseum.local', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!' },
});
const adminJwt = (await login.json())?.data?.token;
if (!adminJwt) throw new Error('admin login failed (rate limited? wait a minute)');
const created = await ctx.post(`${STRAPI}/admin/api-tokens`, {
  headers: { Authorization: `Bearer ${adminJwt}` },
  data: { name: `e2e-cleanup-${Date.now()}`, description: 'cleanup', type: 'full-access', lifespan: null },
});
const token = (await created.json()).data;
const headers = { Authorization: `Bearer ${token.accessKey}` };

const list = async (path: string) => ((await (await ctx.get(`${STRAPI}${path}`, { headers })).json()).data ?? []) as any[];
const del = async (path: string) => ctx.delete(`${STRAPI}${path}`, { headers });

let removed = 0;
for (const event of await list('/api/events?filters[title][$startsWith]=E2E &pagination[pageSize]=100')) {
  for (const p of await list(`/api/problems?filters[event][documentId][$eq]=${event.documentId}&populate[testCases]=true&pagination[pageSize]=200`)) {
    for (const s of await list(`/api/submissions?filters[problem][documentId][$eq]=${p.documentId}&pagination[pageSize]=200`)) {
      for (const e of await list(`/api/executions?filters[submission][documentId][$eq]=${s.documentId}&pagination[pageSize]=200`)) await del(`/api/executions/${e.documentId}`);
      await del(`/api/submissions/${s.documentId}`);
    }
    for (const t of p.testCases ?? []) await del(`/api/test-cases/${t.documentId}`);
    await del(`/api/problems/${p.documentId}`);
    removed++;
  }
  await del(`/api/events/${event.documentId}`);
  removed++;
}
for (const title of ['Snapshot e2e', 'Future secret', 'Sum (', 'Limits (e2e)', 'Guess (interactive']) {
  for (const p of await list(`/api/problems?filters[title][$startsWith]=${encodeURIComponent(title)}&filters[event][$null]=true&populate[testCases]=true&pagination[pageSize]=100`)) {
    for (const t of p.testCases ?? []) await del(`/api/test-cases/${t.documentId}`);
    await del(`/api/problems/${p.documentId}`);
    removed++;
  }
}
for (const l of await list('/api/languages?filters[name][$contains]=e2e&pagination[pageSize]=100')) {
  await del(`/api/languages/${l.documentId}`);
  removed++;
}

await ctx.delete(`${STRAPI}/admin/api-tokens/${token.id}`, { headers: { Authorization: `Bearer ${adminJwt}` } });
console.log(`removed ${removed} leftover e2e records`);
await ctx.dispose();
