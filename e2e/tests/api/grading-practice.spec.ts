import { test, expect } from '@playwright/test';
import { createAdminSession, loginUser } from '../../helpers/api';
import { DAY, HOUR, SOLUTIONS, SUM_TESTS, World, submitAndWait } from '../../helpers/world';

type Session = Awaited<ReturnType<typeof loginUser>>;

const rowOf = (leaderboard: any, username: string) =>
  (leaderboard.leaderboard ?? leaderboard.rows ?? []).find((r: any) => r.user.username === username);

test.describe('grading, practice mode and leaderboards', () => {
  let world: World;
  let dispose: () => Promise<void>;
  let student: Session, alice: Session, bob: Session;
  let languageId: string;

  test.beforeAll(async () => {
    const admin = await createAdminSession();
    dispose = admin.dispose;
    world = new World(admin.api);
    [student, alice, bob] = await Promise.all([loginUser('student'), loginUser('alice'), loginUser('bob')]);
    languageId = await world.language();
  });

  test.afterAll(async () => {
    await world.dispose();
    await dispose();
  });

  test('weighted scoring: live leaderboard counts visible tests, the final one counts all tests by weight', async () => {
    const eventId = await world.liveEvent('grading', languageId);
    const problemId = await world.problem({ title: 'Sum (grading)', eventId, points: 120, tests: SUM_TESTS }); // weights 1,2,3
    await world.register('student', eventId);
    await world.register('alice', eventId);

    // student: correct solution. alice: hard-coded answer that only passes the sample
    const full = await submitAndWait(student.api, problemId, languageId, SOLUTIONS.sum);
    const cheat = await submitAndWait(alice.api, problemId, languageId, SOLUTIONS.hardcodedSample);

    expect(full.executions.every((e) => e.passed)).toBe(true);
    const cheatVisible = cheat.executions.filter((e) => !e.testCase?.hidden);
    expect(cheatVisible.every((e) => e.passed)).toBe(true);

    // Live: only the visible sample counts, so the cheat looks perfect (this is what "public_only_live" means)
    const live = (await student.api.get(`/api/events/${eventId}/leaderboard`)).body;
    expect(rowOf(live, 'student').totalScore).toBe(120);
    expect(rowOf(live, 'alice').totalScore).toBe(120);

    // The event ends: every test counts with its weight. alice only passed weight 1 of 1+2+3
    await world.admin.put(`/api/events/${eventId}`, { data: { end: new Date(Date.now() - 1000).toISOString() } });
    const final = (await student.api.get(`/api/events/${eventId}/leaderboard`)).body;
    expect(rowOf(final, 'student').totalScore).toBe(120);
    expect(rowOf(final, 'alice').totalScore).toBeCloseTo(20, 1); // 1/6 * 120
    const ranks = (final.leaderboard ?? final.rows).map((r: any) => r.user.username);
    expect(ranks.indexOf('student')).toBeLessThan(ranks.indexOf('alice'));
  });

  test('practice submissions never touch an event leaderboard, and only count for the training leaderboard', async () => {
    const endedId = await world.endedEvent('practice', languageId);
    const problemId = await world.problem({ title: 'Sum (practice)', eventId: endedId, tests: SUM_TESTS });
    await world.register('bob', endedId);
    const liveId = await world.liveEvent('practice-live', languageId);
    const liveProblem = await world.problem({ title: 'Sum (practice live)', eventId: liveId, tests: SUM_TESTS });
    await world.register('bob', liveId);

    const before = (await bob.api.get(`/api/events/${endedId}/leaderboard`)).body;
    expect(rowOf(before, 'bob')?.totalScore ?? 0).toBe(0);

    // Not allowed: competing in an event that has ended
    const late = await submitAndWait(bob.api, problemId, languageId, SOLUTIONS.sum);
    expect(late.createStatus).toBe(403);

    // Not allowed: claiming practice for an event that is still running
    const early = await submitAndWait(bob.api, liveProblem, languageId, SOLUTIONS.sum, { practice: true });
    expect(early.createStatus).toBe(403);

    // Allowed: practice on the ended event
    const practice = await submitAndWait(bob.api, problemId, languageId, SOLUTIONS.sum, { practice: true });
    expect(practice.createStatus).toBe(200);
    expect(practice.executions.length).toBeGreaterThan(0);
    expect(practice.executions.every((e) => e.passed)).toBe(true);

    const subs = await bob.api.get(`/api/submissions?filters[problem][documentId][$eq]=${problemId}&populate=event`);
    expect(subs.body.data).toHaveLength(1);
    expect(subs.body.data[0].event ?? null).toBeNull(); // practice submissions are not attached to the event
    expect(subs.body.data[0].metadata.mode).toBe('practice');

    // the ended event leaderboard did not change, nor did the live event's
    const after = (await bob.api.get(`/api/events/${endedId}/leaderboard`)).body;
    expect(rowOf(after, 'bob')?.totalScore ?? 0).toBe(0);
    expect(rowOf(after, 'bob')?.solvedCount ?? 0).toBe(0);
    const liveBoard = (await bob.api.get(`/api/events/${liveId}/leaderboard`)).body;
    expect(rowOf(liveBoard, 'bob')?.totalScore ?? 0).toBe(0);

    // ... while the training leaderboard does show the practice solve
    const training = (await bob.api.get('/api/events/training-leaderboard')).body;
    const bobTraining = training.leaderboard.find((r: any) => r.user.username === 'bob');
    expect(bobTraining?.solvedCount ?? 0).toBeGreaterThanOrEqual(1);
  });

  test('a competition submission is not a practice submission: it does not appear on the training leaderboard', async () => {
    const trainingBefore = (await alice.api.get('/api/events/training-leaderboard')).body;
    const aliceBefore = trainingBefore.leaderboard.find((r: any) => r.user.username === 'alice')?.solvedCount ?? 0;

    const eventId = await world.event({ title: 'compete-only', start: Date.now() - HOUR, end: Date.now() + DAY, languageId });
    const problemId = await world.problem({ title: 'Sum (compete only)', eventId, tests: SUM_TESTS });
    await world.register('alice', eventId);
    const run = await submitAndWait(alice.api, problemId, languageId, SOLUTIONS.sum);
    expect(run.executions.every((e) => e.passed)).toBe(true);

    const trainingAfter = (await alice.api.get('/api/events/training-leaderboard')).body;
    const aliceAfter = trainingAfter.leaderboard.find((r: any) => r.user.username === 'alice')?.solvedCount ?? 0;
    expect(aliceAfter).toBe(aliceBefore);
  });

  test('compile errors and wrong answers fail without leaking details of hidden tests', async () => {
    const eventId = await world.liveEvent('failures', languageId);
    const problemId = await world.problem({ title: 'Sum (failures)', eventId, tests: SUM_TESTS });
    await world.register('student', eventId);

    const broken = await submitAndWait(student.api, problemId, languageId, SOLUTIONS.compileError);
    expect(broken.executions.every((e) => !e.passed)).toBe(true);
    const visible = broken.executions.find((e) => !e.testCase?.hidden);
    expect(visible.stderr).toContain('error');
    const hidden = broken.executions.filter((e) => e.testCase?.hidden);
    for (const e of hidden) {
      expect(e.stderr).toBe('');
      expect(e.stdout).toBe('');
    }
  });
});
