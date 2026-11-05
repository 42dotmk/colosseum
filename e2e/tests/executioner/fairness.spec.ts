import { test, expect } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { execute, PROGRAMS, type Outcome } from '../../helpers/executioner';

/**
 * Fairness: the verdict of a run must not depend on how busy the machine is. Time is judged on the CPU time the
 * program itself used, so the same program must get the same verdict (and almost the same measured time) on an
 * idle server, on a server whose CPUs are all saturated by other work, in a heavily throttled container and
 * while many other jobs run at the same time.
 */
const REF = { MAX_EXECUTION_TIME: '60', MEMORY_LIMIT_PER_EXECUTION: '2G' };
const IMAGE = 'ghcr.io/42dotmk/colosseum-executioner-gcc:latest';
const WORK = PROGRAMS.cpuWork(300_000_000); // a fixed amount of CPU work, about 0.4 s on a free core

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const times = (rs: Outcome[]) => rs.map((r) => r.time!);

/** Starts busy loops until every CPU of the docker host is oversubscribed twice. Returns a stop function. */
const saturateHost = async () => {
  const cpus = Number(execFileSync('docker', ['info', '--format', '{{.NCPU}}'], { encoding: 'utf8' }).trim());
  const names: string[] = [];
  for (let i = 0; i < cpus * 2; i++) {
    const name = `e2e-load-${process.pid}-${i}`;
    names.push(name);
    spawn('docker', ['run', '--rm', '--name', name, '--entrypoint', 'sh', IMAGE, '-c', 'while :; do :; done'], { stdio: 'ignore' });
  }
  await new Promise((r) => setTimeout(r, 4000)); // let them start
  return () => {
    try {
      execFileSync('docker', ['rm', '-f', ...names], { stdio: 'ignore' });
    } catch {
      /* already gone */
    }
  };
};

test.describe('verdicts do not depend on machine load', () => {
  let idle: number; // CPU seconds the work needs on a quiet machine
  let limit: number;

  test.beforeAll(async () => {
    const runs: Outcome[] = [];
    for (let i = 0; i < 3; i++) runs.push(await execute(WORK, { maxCpuTime: 30, maxMemory: 256 }, REF));
    for (const r of runs) expect(r.passed, r.stderr).toBe(true);
    idle = median(times(runs));
    limit = Number((idle * 4).toFixed(2)); // generous margin for the program, a 6x heavier one is still over it
  });

  const verdicts = async (server: Record<string, string>, rounds = 3) => {
    const fits: Outcome[] = [];
    const over: Outcome[] = [];
    const heavy = PROGRAMS.cpuWork(1_800_000_000); // 6x the work: over the limit
    for (let i = 0; i < rounds; i++) {
      fits.push(await execute(WORK, { maxCpuTime: limit, maxMemory: 256 }, { ...REF, ...server }));
      over.push(await execute(heavy, { maxCpuTime: limit, maxMemory: 256 }, { ...REF, ...server }));
    }
    return { fits, over };
  };

  /**
   * Scheduling, quotas and queueing never change the CPU time, so those cases must stay close to idle (maxRatio
   * small). Under a saturated host the silicon itself slows down (shared caches, frequency, hybrid cores): that
   * cannot be removed by software, so the verdict is only guaranteed with a margin, and the slowdown is recorded.
   */
  const expectSameVerdicts = (name: string, { fits, over }: { fits: Outcome[]; over: Outcome[] }, maxRatio: number) => {
    for (const r of fits) expect(r.passed, `${name}: limit ${limit}s, idle ${idle}s: ${r.stderr}`).toBe(true);
    for (const r of over) {
      expect(r.passed, `${name}: heavy program must be over ${limit}s`).toBe(false);
      expect(r.stderr).toContain(`Execution exceeded ${limit}s`);
    }
    const ratio = median(times(fits)) / idle;
    test.info().annotations.push({ type: 'cpu-time-vs-idle', description: `${name}: x${ratio.toFixed(2)}` });
    expect(ratio, `${name}: CPU time vs idle`).toBeGreaterThan(0.5);
    expect(ratio, `${name}: CPU time vs idle`).toBeLessThan(maxRatio);
  };

  test('idle server: reference verdicts', async () => {
    expectSameVerdicts('idle', await verdicts({}), 1.8);
  });

  test('a container throttled to a quarter of a CPU gets the same verdicts', async () => {
    // throttling stretches the wall-clock time a lot, but not the CPU time
    expectSameVerdicts('quota 0.25', await verdicts({ CPU_LIMIT_PER_EXECUTION: '0.25' }), 1.8);
  });

  test('a host with every CPU saturated by other work still gets the same verdicts', async () => {
    const stop = await saturateHost();
    try {
      expectSameVerdicts('saturated host', await verdicts({}), 3.5);
    } finally {
      stop();
    }
  });

  test('the executioner\'s own concurrency (4 jobs at a time) does not change verdicts', async () => {
    for (let round = 0; round < 2; round++) {
      const jobs = Array.from({ length: 4 }, (_, i) =>
        i % 2 === 0
          ? execute(WORK, { maxCpuTime: limit, maxMemory: 256 }, REF)
          : execute(PROGRAMS.cpuWork(1_800_000_000), { maxCpuTime: limit, maxMemory: 256 }, REF),
      );
      const results = await Promise.all(jobs);
      results.forEach((r, i) => {
        if (i % 2 === 0) expect(r.passed, `round ${round} job ${i}: ${r.stderr}`).toBe(true);
        else expect(r.stderr, `round ${round} job ${i}`).toContain(`Execution exceeded ${limit}s`);
      });
      const ratio = median(times(results.filter((_, i) => i % 2 === 0))) / idle;
      test.info().annotations.push({ type: 'cpu-time-vs-idle', description: `4 concurrent, round ${round}: x${ratio.toFixed(2)}` });
      expect(ratio).toBeLessThan(2.2);
    }
  });

  test('a program that only sleeps neither fails on a busy machine nor gets a free pass for being slow', async () => {
    const stop = await saturateHost();
    try {
      const r = await execute(PROGRAMS.sleepFor(1500), { maxCpuTime: 0.5, maxMemory: 256 }, REF);
      expect(r.passed, r.stderr).toBe(true);
    } finally {
      stop();
    }
  });
});

test.describe('TIME_LIMIT_SCALE is for genuinely slower CPUs and scales the CPU allowance', () => {
  test('without a scale 1.5 s of CPU fails a 1 s limit, with scale 2 it passes, and the participant sees 1 s', async () => {
    const program = PROGRAMS.busyFor(1500);
    const plain = await execute(program, { maxCpuTime: 1, maxMemory: 256 }, REF);
    expect(plain.passed).toBe(false);
    expect(plain.stderr).toContain('Execution exceeded 1s');

    const scaled = await execute(program, { maxCpuTime: 1, maxMemory: 256 }, { ...REF, TIME_LIMIT_SCALE: '2' });
    expect(scaled.passed, scaled.stderr).toBe(true);

    const stillBounded = await execute(PROGRAMS.busyFor(2500), { maxCpuTime: 1, maxMemory: 256 }, { ...REF, TIME_LIMIT_SCALE: '2' });
    expect(stillBounded.passed).toBe(false);
    expect(stillBounded.stderr).toContain('Execution exceeded 1s'); // the unscaled limit
  });
});
