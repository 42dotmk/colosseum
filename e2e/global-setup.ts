import { request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Strapi rate-limits login endpoints, so the suite logs in once (admin + seeded users) and shares the
 * sessions through a cache file instead of every spec file logging in again.
 */
const STRAPI = process.env.STRAPI_URL ?? 'http://localhost:1337';
export const SESSION_FILE = path.resolve(import.meta.dirname, '.sessions.json');

const USERS = {
  student: ['student@colosseum.local', 'Student123!'],
  alice: ['alice@colosseum.local', 'Alice123!'],
  bob: ['bob@colosseum.local', 'Bob12345!'],
  mallory: ['mallory@colosseum.local', 'Mallory123!'],
};

export default async function globalSetup() {
  const ctx = await request.newContext();
  const sessions: any = { users: {} };

  for (const [name, [identifier, password]] of Object.entries(USERS)) {
    const res = await ctx.post(`${STRAPI}/api/auth/local`, { data: { identifier, password } });
    const body = await res.json();
    if (!body.jwt) throw new Error(`login failed for ${name}: ${JSON.stringify(body)} (is the stack seeded?)`);
    sessions.users[name] = { jwt: body.jwt, id: body.user.id, documentId: body.user.documentId };
  }

  const adminLogin = await ctx.post(`${STRAPI}/admin/login`, {
    data: {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@colosseum.local',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!',
    },
  });
  const adminJwt = (await adminLogin.json())?.data?.token;
  if (!adminJwt) throw new Error('admin login failed (is the seed enabled? SEED_DEV_DATA=true)');

  const created = await ctx.post(`${STRAPI}/admin/api-tokens`, {
    headers: { Authorization: `Bearer ${adminJwt}` },
    data: { name: `e2e-${Date.now()}`, description: 'temporary e2e token', type: 'full-access', lifespan: null },
  });
  const token = (await created.json()).data;
  sessions.admin = { jwt: adminJwt, tokenId: token.id, accessKey: token.accessKey };

  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions));
  await ctx.dispose();
}
