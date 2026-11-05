import { request as pwRequest, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const STRAPI = process.env.STRAPI_URL ?? 'http://localhost:1337';
export const WEB = process.env.WEB_URL ?? 'http://localhost:1338';

export const USERS = {
  student: { email: 'student@colosseum.local', password: 'Student123!' },
  alice: { email: 'alice@colosseum.local', password: 'Alice123!' },
  bob: { email: 'bob@colosseum.local', password: 'Bob12345!' },
  mallory: { email: 'mallory@colosseum.local', password: 'Mallory123!' },
} as const;
export type UserName = keyof typeof USERS;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Thin typed wrapper around a Strapi REST session (user JWT or full-access API token). */
export class Api {
  constructor(
    private ctx: APIRequestContext,
    private token?: string,
  ) {}

  private headers() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  async get(path: string) {
    const res = await this.ctx.get(`${STRAPI}${path}`, { headers: this.headers() });
    return { status: res.status(), body: await res.json().catch(() => null), text: await res.text().catch(() => '') };
  }
  async post(path: string, data?: unknown) {
    const res = await this.ctx.post(`${STRAPI}${path}`, { headers: this.headers(), data });
    return { status: res.status(), body: await res.json().catch(() => null) };
  }
  async put(path: string, data?: unknown) {
    const res = await this.ctx.put(`${STRAPI}${path}`, { headers: this.headers(), data });
    return { status: res.status(), body: await res.json().catch(() => null) };
  }
  /** Cleanup helper: retries once on a connection reset, never throws (cleanup must not fail a run). */
  async del(path: string) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await this.ctx.delete(`${STRAPI}${path}`, { headers: this.headers() });
        return { status: res.status() };
      } catch {
        await sleep(500);
      }
    }
    return { status: 0 };
  }
}

export const newContext = () => pwRequest.newContext();

const sessions = () => JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../.sessions.json'), 'utf8'));

/** Seeded users are logged in once by global-setup (Strapi rate-limits logins). */
export const loginUser = async (name: UserName) => {
  const u = sessions().users[name];
  if (!u) throw new Error(`no cached session for ${name}`);
  return { api: new Api(await newContext(), u.jwt), jwt: u.jwt as string, id: u.id as number, documentId: u.documentId as string };
};

export const anonymous = async () => new Api(await newContext());

/** Full-access API token created by global-setup, so tests can set up and clean up data. */
export const createAdminSession = async () => {
  const { admin } = sessions();
  const ctx = await newContext();
  return { api: new Api(ctx, admin.accessKey), dispose: async () => ctx.dispose() };
};
