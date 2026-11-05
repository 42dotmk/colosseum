import { test, expect } from '@playwright/test';
import { execute, PROGRAMS } from '../../helpers/executioner';

/**
 * Behaviour of the execution limits at the edges. Every case runs through the real executioner and the real
 * runtime image on a "reference" server (generous caps), so what is tested is the limit itself.
 */
const REF = { MAX_EXECUTION_TIME: '60', MEMORY_LIMIT_PER_EXECUTION: '2G' };

test.describe('memory limits', () => {
  test.describe('10 MB', () => {
    const ask = { maxMemory: 10, maxCpuTime: 5 };

    test('a trivial program and a small allocation fit', async () => {
      expect((await execute(PROGRAMS.hello, ask, REF)).passed).toBe(true);
      expect((await execute(PROGRAMS.alloc(4), ask, REF)).passed).toBe(true);
    });

    test('going past the limit is reported as memory limit exceeded', async () => {
      const r = await execute(PROGRAMS.alloc(15), ask, REF);
      expect(r.passed).toBe(false);
      expect(r.stderr).toContain('Memory limit exceeded (10MB)');
      expect(r.stdout).not.toContain('ok');
    });
  });

  test.describe('100 MB', () => {
    const ask = { maxMemory: 100, maxCpuTime: 10 };

    test('50 MB and 90 MB fit', async () => {
      expect((await execute(PROGRAMS.alloc(50), ask, REF)).passed).toBe(true);
      expect((await execute(PROGRAMS.alloc(90), ask, REF)).passed).toBe(true);
    });

    test('110 MB and 400 MB do not', async () => {
      for (const mb of [110, 400]) {
        const r = await execute(PROGRAMS.alloc(mb), ask, REF);
        expect(r.passed, `alloc ${mb}MB`).toBe(false);
        expect(r.stderr).toContain('Memory limit exceeded (100MB)');
      }
    });
  });

  test('the limit is on address space: a large untouched array counts, a small one does not', async () => {
    // documents the semantics (like RLIMIT_AS judges): reserved memory is memory
    expect((await execute(PROGRAMS.untouchedGlobal(64), { maxMemory: 100, maxCpuTime: 5 }, REF)).passed).toBe(true);
    const tooBig = await execute(PROGRAMS.untouchedGlobal(64), { maxMemory: 40, maxCpuTime: 5 }, REF);
    expect(tooBig.passed).toBe(false);
  });

  test('a stack overflow ends quickly as a failure instead of hanging', async () => {
    const r = await execute(PROGRAMS.stackOverflow, { maxMemory: 64, maxCpuTime: 5 }, REF);
    expect(r.passed).toBe(false);
    expect(r.wallMs).toBeLessThan(60_000);
  });
});

test.describe('time limits', () => {
  test.describe('100 ms', () => {
    const ask = { maxCpuTime: 0.1, maxMemory: 256 };

    test('a quick program fits', async () => {
      const r = await execute(PROGRAMS.hello, ask, REF);
      expect(r.passed).toBe(true);
      // the runtime itself is ~10 ms; process start noise can add a little, so the bound is loose
      expect(r.time).toBeLessThan(0.5);
    });

    test('a 300 ms program is stopped close to the limit', async () => {
      const r = await execute(PROGRAMS.busyFor(300), ask, REF);
      expect(r.passed).toBe(false);
      expect(r.stderr).toContain('Execution exceeded 0.1s');
      expect(r.time).toBeGreaterThanOrEqual(0.1);
      expect(r.time).toBeLessThan(0.4); // killed at the deadline, not at the end of the program
    });
  });

  test('sub-second limits are precise: 250 ms limit, 150 ms passes and 600 ms does not', async () => {
    const ask = { maxCpuTime: 0.25, maxMemory: 256 };
    expect((await execute(PROGRAMS.busyFor(150), ask, REF)).passed).toBe(true);
    const slow = await execute(PROGRAMS.busyFor(600), ask, REF);
    expect(slow.passed).toBe(false);
    expect(slow.stderr).toContain('Execution exceeded 0.25s');
  });

  test.describe('3 s', () => {
    const ask = { maxCpuTime: 3, maxMemory: 256 };

    test('2.5 s of work fits', async () => {
      const r = await execute(PROGRAMS.busyFor(2500), ask, REF);
      expect(r.passed).toBe(true);
      expect(r.time).toBeLessThan(3);
    });

    test('3.5 s of work is stopped at 3 s', async () => {
      const r = await execute(PROGRAMS.busyFor(3500), ask, REF);
      expect(r.passed).toBe(false);
      expect(r.stderr).toContain('Execution exceeded 3s');
      expect(r.time).toBeGreaterThanOrEqual(3);
      expect(r.time).toBeLessThan(3.6);
    });

    test('waiting counts as well: a program that sleeps 5 s is stopped at 3 s', async () => {
      const r = await execute(PROGRAMS.sleepFor(5000), ask, REF);
      expect(r.passed).toBe(false);
      expect(r.stderr).toContain('Execution exceeded 3s');
    });
  });

  test('a program waiting for input that is not there does not hang the job', async () => {
    const r = await execute(PROGRAMS.readsInput, { maxCpuTime: 3, maxMemory: 256 }, REF, '');
    expect(r.wallMs).toBeLessThan(30_000);
  });
});

test.describe('abuse', () => {
  test('endless output is cut at the output limit', async () => {
    const r = await execute(PROGRAMS.infiniteOutput, { maxCpuTime: 10, maxMemory: 256 }, { ...REF, OUTPUT_LIMIT_MB: '2' });
    expect(r.passed).toBe(false);
    expect(r.stderr).toContain('Output limit exceeded (2MB)');
    expect(r.stdout.length).toBeLessThanOrEqual(2 * 1024 * 1024 + 4096);
    expect(r.wallMs).toBeLessThan(40_000);
  });

  test('crashing programs are not slowed by core dumps, so they are never mistaken for a time limit failure', async () => {
    // 100 MB touched, then abort(): a core dump of that would take long enough to hit a 2 s deadline under load
    const crash =
      '#include <cstdlib>\n#include <cstring>\nint main(){char*p=new char[100<<20];std::memset(p,1,100<<20);std::abort();}';
    const runs = await Promise.all(
      Array.from({ length: 6 }, () => execute(crash, { maxCpuTime: 2, maxMemory: 256 }, REF)),
    );
    for (const r of runs) {
      expect(r.passed).toBe(false);
      expect(r.stderr).not.toContain('Execution exceeded');
    }
  });

  test('a fork bomb is contained: the job ends, fails, and the host keeps working', async () => {
    const r = await execute(PROGRAMS.forkBomb, { maxCpuTime: 3, maxMemory: 128 }, { ...REF, PIDS_LIMIT_PER_EXECUTION: '64' });
    expect(r.passed).toBe(false);
    expect(r.wallMs).toBeLessThan(90_000);
    // a normal job right afterwards still works
    expect((await execute(PROGRAMS.hello, { maxCpuTime: 5, maxMemory: 64 }, REF)).passed).toBe(true);
  });
});
