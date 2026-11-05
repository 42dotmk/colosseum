import { test, expect } from '@playwright/test';
import { createAdminSession, loginUser, anonymous, STRAPI, USERS, type Api } from '../../helpers/api';
import { DAY } from '../../helpers/world';

test.describe('seed data', () => {
  let admin: Awaited<ReturnType<typeof createAdminSession>>;
  let events: any[];

  test.beforeAll(async () => {
    admin = await createAdminSession();
    const res = await admin.api.get(
      '/api/events?filters[title][$startsWith]=C%2B%2B Course&sort=start:asc&pagination[pageSize]=20&populate[problems][populate][testCases]=true',
    );
    expect(res.status, JSON.stringify(res.body ?? res.text)).toBe(200);
    events = res.body.data;
  });

  test.afterAll(async () => {
    await admin.dispose();
  });

  test('five course events, two weeks apart, starting on the configured date', async () => {
    expect(events).toHaveLength(5);
    expect(events.map((e) => e.title.match(/Lecture (\d+)/)![1])).toEqual(['1', '2', '4', '5', '8']);
    const first = new Date(process.env.SEED_FIRST_EVENT_START ?? '2026-12-01T00:00:00Z').getTime();
    events.forEach((e, i) => {
      expect(new Date(e.start).getTime()).toBe(first + i * 14 * DAY);
      expect(new Date(e.end).getTime()).toBeGreaterThan(new Date(e.start).getTime());
      expect(new Date(e.end).getTime()).toBeLessThan(first + (i + 1) * 14 * DAY); // events do not overlap
    });
  });

  test('every lecture has its 20 homework problems (plus one interactive problem in lecture 5)', async () => {
    const counts = events.map((e) => e.problems.length);
    expect(counts).toEqual([20, 20, 20, 21, 20]);
    const interactive = events.flatMap((e) => e.problems).filter((p: any) => p.isInteractive);
    expect(interactive).toHaveLength(1);
    expect(interactive[0].title).toContain('Guess the number');
  });

  test('test case roles and weights follow sample / hidden / hidden+locked', async () => {
    for (const problem of events.flatMap((e) => e.problems).filter((p: any) => !p.isInteractive)) {
      const tests = [...problem.testCases].sort((a: any, b: any) => a.weight - b.weight);
      expect(tests.length, problem.title).toBeGreaterThanOrEqual(1);
      expect(tests[0]).toMatchObject({ hidden: false, locked: false, weight: 1 });
      if (tests[1]) expect(tests[1]).toMatchObject({ hidden: true, locked: false, weight: 2 });
      if (tests[2]) expect(tests[2]).toMatchObject({ hidden: true, locked: true, weight: 3 });
      expect(tests[0].input).toBeDefined();
      expect(tests[0].output).toBeDefined();
    }
  });

  test('descriptions are English homework statements', async () => {
    const first = events[0].problems.find((p: any) => /Business card/.test(p.title));
    expect(first.description).toContain('## Task');
    expect(first.points).toBeGreaterThanOrEqual(100);
  });

  test('seeded users can log in, the Strapi admin exists', async () => {
    for (const name of Object.keys(USERS) as (keyof typeof USERS)[]) {
      const session = await loginUser(name);
      expect(session.jwt).toBeTruthy();
    }
    const anon: Api = await anonymous();
    const login = await anon.post('/admin/login', {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@colosseum.local',
      password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!',
    });
    expect(login.status).toBe(200);
    expect(STRAPI).toContain('http');
  });

  test('the seeded participants are registered for every event, mallory for none', async () => {
    for (const name of ['student', 'alice', 'bob'] as const) {
      const { api } = await loginUser(name);
      const regs = await api.get('/api/event-registrations?populate=event&pagination[pageSize]=100');
      const titles = regs.body.data.map((r: any) => r.event?.title).filter((t: string) => t?.startsWith('C++ Course'));
      expect(titles.length, name).toBe(5);
    }
    const { api } = await loginUser('mallory');
    const regs = await api.get('/api/event-registrations?populate=event&pagination[pageSize]=100');
    expect(regs.body.data.filter((r: any) => r.event?.title?.startsWith('C++ Course'))).toHaveLength(0);
  });
});
