import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { execute, PROGRAMS } from '../../helpers/executioner';

/**
 * Servers differ in speed. A time limit is only fair if it is measured against the server's own speed:
 * a slower server declares TIME_LIMIT_SCALE and gets proportionally more wall-clock time, while the limit
 * reported to the participant stays the same. Slower hardware is simulated with a CPU quota and, when
 * available, a different CPU architecture (arm64 under emulation).
 */
const REF = { MAX_EXECUTION_TIME: '60', MEMORY_LIMIT_PER_EXECUTION: '2G' };
const WORK = PROGRAMS.cpuWork(500_000_000); // about 0.7 s on a full-speed core

test.describe('slower servers', () => {
  let reference: number; // seconds the work takes on the full-speed server
  let slowTime: number; // seconds it takes with half a CPU

  test.beforeAll(async () => {
    const r = await execute(WORK, { maxCpuTime: 30, maxMemory: 256 }, REF);
    expect(r.passed, r.stderr).toBe(true);
    reference = r.time!;
    const s = await execute(WORK, { maxCpuTime: 60, maxMemory: 256 }, { ...REF, CPU_LIMIT_PER_EXECUTION: '0.5' });
    expect(s.passed, s.stderr).toBe(true);
    slowTime = s.time!;
  });

  test('a CPU quota really makes the same work slower', async () => {
    expect(slowTime).toBeGreaterThan(reference * 1.5);
  });

  test('without a scale the slower server fails a limit the reference passes (unfair)', async () => {
    const limit = Number((reference * 1.6).toFixed(2));
    const onReference = await execute(WORK, { maxCpuTime: limit, maxMemory: 256 }, REF);
    expect(onReference.passed, `limit ${limit}s: ${onReference.stderr}`).toBe(true);
    const onSlow = await execute(WORK, { maxCpuTime: limit, maxMemory: 256 }, { ...REF, CPU_LIMIT_PER_EXECUTION: '0.5' });
    expect(onSlow.passed).toBe(false);
    expect(onSlow.stderr).toContain(`Execution exceeded ${limit}s`);
  });

  test('with TIME_LIMIT_SCALE the slower server gives the same verdict as the reference', async () => {
    const limit = Number((reference * 1.6).toFixed(2));
    const scale = Math.ceil((slowTime / reference) * 1.4 * 10) / 10;
    const server = { ...REF, CPU_LIMIT_PER_EXECUTION: '0.5', TIME_LIMIT_SCALE: String(scale) };

    const ok = await execute(WORK, { maxCpuTime: limit, maxMemory: 256 }, server);
    expect(ok.passed, `limit ${limit}s x${scale}: ${ok.stderr}`).toBe(true);

    // a program that is really too slow still fails, and the participant is told the unscaled limit
    const tooSlow = await execute(PROGRAMS.busyFor(10_000), { maxCpuTime: limit, maxMemory: 256 }, server);
    expect(tooSlow.passed).toBe(false);
    expect(tooSlow.stderr).toContain(`Execution exceeded ${limit}s`);
    expect(tooSlow.limitsLine).toContain(`deadline ${Number((limit * scale).toFixed(3))}s on this server`);
  });
});

test.describe('another CPU architecture', () => {
  const IMAGE = 'ghcr.io/42dotmk/colosseum-executioner-arm64-gcc:latest';
  const arm = { ...REF, EXECUTION_PLATFORM: 'linux/arm64', IMAGE_BASE: 'ghcr.io/42dotmk/colosseum-executioner-arm64-' };

  test.beforeAll(() => {
    let present = false;
    try {
      execSync(`docker image inspect ${IMAGE}`, { stdio: 'ignore' });
      present = true;
    } catch {
      /* not built */
    }
    test.skip(!present, `build it with: docker build --platform linux/arm64 -t ${IMAGE} executioner/runtimes/languages/gcc`);
  });

  test('the same code compiles and runs on arm64 with the same limits and messages', async () => {
    const arch = `#include <iostream>\nint main(){
#if defined(__aarch64__)
std::cout<<"ok\\n";
#else
std::cout<<"wrong arch\\n";
#endif
}`;
    const r = await execute(arch, { maxCpuTime: 30, maxMemory: 256 }, arm);
    expect(r.passed, `${r.stdout} ${r.stderr}`).toBe(true);

    const time = await execute(PROGRAMS.busyFor(5000), { maxCpuTime: 2, maxMemory: 256 }, arm);
    expect(time.passed).toBe(false);
    expect(time.stderr).toContain('Execution exceeded 2s');
  });

  // KNOWN LIMITATION: the memory limit is an address-space limit (ulimit -v). QEMU user-mode emulation does not
  // apply it to the emulated program, so on an emulated architecture memory is NOT enforced (a native arm64 server
  // enforces it like any other). Treat emulated servers as time-checked only. This test is expected to fail on
  // emulation and must pass on a native arm64 host.
  test('memory limit on arm64', async () => {
    test.fail(process.arch !== 'arm64', 'QEMU user-mode emulation ignores the address-space limit');
    const memory = await execute(PROGRAMS.alloc(150), { maxCpuTime: 30, maxMemory: 100 }, arm);
    expect(memory.passed).toBe(false);
    expect(memory.stderr).toContain('Memory limit exceeded (100MB)');
  });

  test('emulated arm64 gets its own TIME_LIMIT_SCALE and then agrees with the reference', async () => {
    const work = PROGRAMS.cpuWork(200_000_000);
    const ref = await execute(work, { maxCpuTime: 30, maxMemory: 256 }, REF);
    const onArm = await execute(work, { maxCpuTime: 120, maxMemory: 256 }, arm);
    expect(onArm.passed, onArm.stderr).toBe(true);
    const slowdown = onArm.time! / ref.time!;
    expect(slowdown).toBeGreaterThan(0.5); // emulation costs time (about 1.2x here), never a speed-up by magic

    const limit = Number((ref.time! * 2).toFixed(2));
    const scale = Math.ceil(Math.max(slowdown, 1) * 1.5 * 10) / 10;
    const scaled = await execute(work, { maxCpuTime: limit, maxMemory: 256 }, { ...arm, TIME_LIMIT_SCALE: String(scale) });
    expect(scaled.passed, `limit ${limit}s x${scale}: ${scaled.stderr}`).toBe(true);
  });
});
