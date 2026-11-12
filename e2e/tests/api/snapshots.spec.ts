import { test, expect } from '@playwright/test';
import { createAdminSession } from '../../helpers/api';
import { SUM_TESTS, World } from '../../helpers/world';

/**
 * Assigning problems to an event through `event.problems` clones them (isSnapshot) so later edits of the
 * original, or reuse of the original in another event, cannot change an event that is already running.
 */
test.describe('problem snapshots', () => {
  let world: World;
  let dispose: () => Promise<void>;

  test.beforeAll(async () => {
    const admin = await createAdminSession();
    dispose = admin.dispose;
    world = new World(admin.api);
  });

  test.afterAll(async () => {
    // Snapshots are created by the lifecycle, so they are not tracked by World: remove them explicitly
    const snaps = await world.admin.get('/api/problems?filters[isSnapshot][$eq]=true&filters[title][$startsWith]=Snapshot e2e&populate[testCases]=true&pagination[pageSize]=100');
    for (const p of snaps.body?.data ?? []) {
      for (const t of p.testCases ?? []) await world.admin.del(`/api/test-cases/${t.documentId}`);
      await world.admin.del(`/api/problems/${p.documentId}`);
    }
    await world.dispose();
    await dispose();
  });

  test('assigning a problem to an event creates an independent snapshot', async () => {
    const original = await world.problem({ title: 'Snapshot e2e original', tests: SUM_TESTS });
    const eventId = await world.event({ title: 'snapshot', start: Date.now() - 3600_000, end: Date.now() + 86_400_000 });

    const update = await world.admin.put(`/api/events/${eventId}`, { data: { problems: [original] } });
    expect(update.status).toBe(200);

    const forEvent = await world.admin.get(`/api/problems?filters[event][documentId][$eq]=${eventId}&populate[testCases]=true&populate[snapshotSource]=true`);
    expect(forEvent.status, JSON.stringify(forEvent.body)).toBe(200);
    const problems = forEvent.body.data as any[];
    expect(problems).toHaveLength(1);
    const snapshot = problems[0];

    expect(snapshot.documentId).not.toBe(original);
    expect(snapshot.isSnapshot).toBe(true);
    expect(snapshot.snapshotSource.documentId).toBe(original);
    expect(snapshot.title).toBe('Snapshot e2e original');
    expect(snapshot.testCases).toHaveLength(SUM_TESTS.length);
    // test roles and weights are copied as well
    const byInput = Object.fromEntries(snapshot.testCases.map((t: any) => [t.input, t]));
    expect(byInput['1 2\n'].hidden).toBe(false);
    expect(byInput['10 20\n'].hidden).toBe(true);
    expect(byInput['100 200\n'].locked).toBe(true);
    expect(byInput['100 200\n'].weight).toBe(3);

    // the original is released again (not attached to the event) and stays reusable
    const orig = await world.admin.get(`/api/problems/${original}?populate=event`);
    expect(orig.body.data.event ?? null).toBeNull();
    expect(orig.body.data.isSnapshot).not.toBe(true);

    // editing the original does not change the running event
    await world.admin.put(`/api/problems/${original}`, { data: { title: 'Snapshot e2e original (edited)', points: 999 } });
    const again = await world.admin.get(`/api/problems/${snapshot.documentId}`);
    expect(again.body.data.title).toBe('Snapshot e2e original');
    expect(again.body.data.points).not.toBe(999);
  });

  test('the same original can back two events independently', async () => {
    const original = await world.problem({ title: 'Snapshot e2e shared', tests: SUM_TESTS });
    const first = await world.event({ title: 'snapshot-a', start: Date.now() + 86_400_000, end: Date.now() + 2 * 86_400_000 });
    const second = await world.event({ title: 'snapshot-b', start: Date.now() + 86_400_000, end: Date.now() + 2 * 86_400_000 });

    await world.admin.put(`/api/events/${first}`, { data: { problems: [original] } });
    await world.admin.put(`/api/events/${second}`, { data: { problems: [original] } });

    const a = (await world.admin.get(`/api/problems?filters[event][documentId][$eq]=${first}`)).body.data;
    const b = (await world.admin.get(`/api/problems?filters[event][documentId][$eq]=${second}`)).body.data;
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0].documentId).not.toBe(b[0].documentId);
    expect(a[0].isSnapshot && b[0].isSnapshot).toBe(true);
  });

  test('snapshots are not re-snapshotted when the event is saved again', async () => {
    const original = await world.problem({ title: 'Snapshot e2e stable', tests: SUM_TESTS });
    const eventId = await world.event({ title: 'snapshot-stable', start: Date.now() + 86_400_000, end: Date.now() + 2 * 86_400_000 });
    await world.admin.put(`/api/events/${eventId}`, { data: { problems: [original] } });
    const firstId = (await world.admin.get(`/api/problems?filters[event][documentId][$eq]=${eventId}`)).body.data[0].documentId;

    await world.admin.put(`/api/events/${eventId}`, { data: { problems: [firstId] } });
    const afterIds = (await world.admin.get(`/api/problems?filters[event][documentId][$eq]=${eventId}`)).body.data.map((p: any) => p.documentId);
    expect(afterIds).toEqual([firstId]);
  });
});
