import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { createAdminSession, loginUser, sleep } from '../../helpers/api';
import { EXECUTIONER_DIR, PROGRAMS, TSX } from '../../helpers/executioner';
import { World, submitAndWait } from '../../helpers/world';

/**
 * Two executioners on the same queue with different capabilities:
 *   strong  the stack's own executioner, up to 10 s / 1 GB (started by the quickstart or by hand)
 *   weak    started here, up to 2 s / 64 MB
 * Jobs are handed out round-robin, so each job may land on either. The verdict must not depend on which one.
 */
test.describe('two executioners with different capabilities', () => {
  let world: World;
  let dispose: () => Promise<void>;
  let student: Awaited<ReturnType<typeof loginUser>>;
  let weak: ChildProcess;
  let weakLog = '';

  const sampleProblem = async (languageId: string, title: string) => {
    const eventId = await world.liveEvent(title, languageId);
    // one visible test so the participant can read the runtime message
    const problemId = await world.problem({ title, eventId, tests: [{ input: '', output: 'ok\n' }] });
    await world.register('student', eventId);
    return problemId;
  };

  test.beforeAll(async () => {
    const admin = await createAdminSession();
    dispose = admin.dispose;
    world = new World(admin.api);
    student = await loginUser('student');

    weak = spawn(process.execPath, [TSX, 'index.ts'], {
      cwd: EXECUTIONER_DIR,
      env: {
        ...process.env,
        EXECUTOR_NAME: 'weak',
        MAX_EXECUTION_TIME: '2',
        MEMORY_LIMIT_PER_EXECUTION: '64m',
        MAX_JOB_WAIT_SECONDS: '25',
        PREFETCH_COUNT: '2',
        WORKDIR: '_work-weak',
      },
    });
    weak.stdout!.on('data', (d) => (weakLog += d.toString()));
    weak.stderr!.on('data', (d) => (weakLog += d.toString()));
    for (let i = 0; i < 60 && !weakLog.includes('Connected to RabbitMQ'); i++) await sleep(500);
    expect(weakLog).toContain('Executioner "weak": up to 2s and 64MB');
  });

  test.afterAll(async () => {
    weak?.kill();
    await sleep(500);
    await world.dispose();
    await dispose();
  });

  test('a job the weak server cannot fully serve is never run by it, so it is never cut short', async () => {
    // 5 s / 256 MB requested, the work takes 3 s: a weak server clipping to 2 s would fail it
    const languageId = await world.language({ name: 'C++ 5s/256MB (fleet)', maxCpuTime: 5, maxMemory: 256 });
    const problemId = await sampleProblem(languageId, 'fleet-big');

    const runs = await Promise.all(
      Array.from({ length: 6 }, () => submitAndWait(student.api, problemId, languageId, PROGRAMS.busyFor(3000))),
    );
    for (const [i, r] of runs.entries()) {
      expect(r.executions[0].passed, `run ${i}: ${r.executions[0].stderr}`).toBe(true);
    }
    expect(weakLog).toContain('declining job');
    expect(weakLog).not.toContain('Limits for this execution: 5s');
  });

  test('a job both servers can satisfy gets the same verdict from either', async () => {
    const languageId = await world.language({ name: 'C++ 2s/32MB (fleet)', maxCpuTime: 2, maxMemory: 32 });
    const problemId = await sampleProblem(languageId, 'fleet-small');

    // Wall-clock limits need spare CPU: run a realistic load (4 jobs at a time, two rounds) instead of a burst.
    // Round-robin delivery sends the same program to different servers in different rounds.
    const programs = [PROGRAMS.busyFor(200), PROGRAMS.busyFor(4000), PROGRAMS.alloc(10), PROGRAMS.alloc(60)];
    const rounds: Awaited<ReturnType<typeof submitAndWait>>[][] = [];
    for (let round = 0; round < 3; round++) {
      rounds.push(await Promise.all(programs.map((code) => submitAndWait(student.api, problemId, languageId, code))));
    }
    for (const [round, results] of rounds.entries()) {
      const [quick, slow, small, big] = results.map((r) => r.executions[0]);
      expect(quick.passed, `round ${round}: ${quick.stderr}`).toBe(true);
      expect(slow.passed).toBe(false);
      expect(slow.stderr, `round ${round}`).toContain('Execution exceeded 2s');
      expect(small.passed, `round ${round}: ${small.stderr}`).toBe(true);
      expect(big.passed).toBe(false);
      expect(big.stderr, `round ${round}`).toContain('Memory limit exceeded (32MB)');
    }
    // both servers did take part
    expect(weakLog).toContain('Limits for this execution: 2s, 32MB');
  });

  test('a job that no server can satisfy fails with a clear message instead of waiting forever', async () => {
    const languageId = await world.language({ name: 'C++ 30s/256MB (fleet)', maxCpuTime: 30, maxMemory: 256 });
    const problemId = await sampleProblem(languageId, 'fleet-impossible');

    const started = Date.now();
    const r = await submitAndWait(student.api, problemId, languageId, PROGRAMS.hello, { timeoutMs: 120_000 });
    expect(r.executions[0].passed).toBe(false);
    expect(r.executions[0].stderr).toContain('No execution server can satisfy the limits of this problem (30s, 256MB)');
    expect(Date.now() - started).toBeLessThan(120_000);
  });
});
