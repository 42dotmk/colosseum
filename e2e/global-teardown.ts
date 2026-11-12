import { request } from '@playwright/test';
import fs from 'node:fs';
import { SESSION_FILE } from './global-setup';

const STRAPI = process.env.STRAPI_URL ?? 'http://localhost:1337';

export default async function globalTeardown() {
  if (!fs.existsSync(SESSION_FILE)) return;
  const { admin } = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  const ctx = await request.newContext();
  await ctx.delete(`${STRAPI}/admin/api-tokens/${admin.tokenId}`, { headers: { Authorization: `Bearer ${admin.jwt}` } });
  await ctx.dispose();
  fs.rmSync(SESSION_FILE);
}
