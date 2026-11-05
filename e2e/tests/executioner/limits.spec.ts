import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { getServerCaps, parseMemoryToMb, resolveLimits } from '../../../executioner/languages/limits';
import { createAdminSession, loginUser } from '../../helpers/api';
import { SOLUTIONS, SUM_TESTS, World, submitAndWait } from '../../helpers/world';

const run = promisify(execFile);
const EXECUTIONER_DIR = path.resolve(import.meta.dirname, '../../../executioner');
const TSX = path.join(EXECUTIONER_DIR, 'node_modules/tsx/dist/cli.mjs');

/** Runs one job directly through the executioner with the given "server" capabilities. */
const execute = async (code: string, request: { maxCpuTime?: number; maxMemory?: number }, serverEnv: Record<string, string>) => {
  const job = {
    sources: [{ filename: 'main.cpp', content: code }],
    input: [{ filename: 't1', content: '', metadata: { id: 1 } }],
    options: { language: 'cpp', entrypointFile: 'main.cpp', ...request },
  };
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-job-')), 'job.json');
  fs.writeFileSync(file, JSON.stringify(job));
  const started = Date.now();
  const { stdout } = await run(process.execPath, [TSX, 'tools/exec-cli.ts', file], {
    cwd: EXECUTIONER_DIR,
    env: { ...process.env, ...serverEnv },
    maxBuffer: 20 * 1024 * 1024,
  });
  const line = stdout.split('\n').find((l) => l.startsWith('RESULT_JSON:'));
  if (!line) throw new Error(`no result from executioner:\n${stdout}`);
  const [result] = JSON.parse(line.slice('RESULT_JSON:'.length));
  return { ...result, wallMs: Date.now() - started, limitsLine: stdout.split('\n').find((l) => l.includes('Limits for this execution')) };
};

test.describe('limit resolution (pure)', () => {
  test('memory strings are parsed to megabytes', () => {
    expect(parseMemoryToMb('1G')).toBe(1024);
    expect(parseMemoryToMb('512m')).toBe(512);
    expect(parseMemoryToMb('256')).toBe(256);
    expect(parseMemoryToMb(64)).toBe(64);
    expect(parseMemoryToMb('nonsense')).toBeNull();
    expect(parseMemoryToMb(undefined)).toBeNull();
  });

  test('the smaller of requested limit and server capability wins', () => {
    const small = { maxTimeSeconds: 2, maxMemoryMb: 64 };
    const large = { maxTimeSeconds: 10, maxMemoryMb: 1024 };
    expect(resolveLimits({ maxCpuTime: 5, maxMemory: 256 }, small)).toEqual({ timeSeconds: 2, memoryMb: 64 }); // server too weak
    expect(resolveLimits({ maxCpuTime: 5, maxMemory: 256 }, large)).toEqual({ timeSeconds: 5, memoryMb: 256 }); // request is stricter
    expect(resolveLimits({}, large)).toEqual({ timeSeconds: 10, memoryMb: 1024 }); // no request: server default
    expect(resolveLimits({ maxCpuTime: 0, maxMemory: -1 }, small)).toEqual({ timeSeconds: 2, memoryMb: 64 }); // junk is ignored
    expect(resolveLimits({ maxCpuTime: 999, maxMemory: 99999 }, small)).toEqual({ timeSeconds: 2, memoryMb: 64 }); // never above the cap
  });

  test('server capabilities come from the environment with safe defaults', () => {
    expect(getServerCaps({} as any)).toEqual({ maxTimeSeconds: 10, maxMemoryMb: 1024 });
    expect(getServerCaps({ MAX_EXECUTION_TIME: '3', MEMORY_LIMIT_PER_EXECUTION: '128m' } as any)).toEqual({ maxTimeSeconds: 3, maxMemoryMb: 128 });
  });
});

test.describe('executioner on servers with different capabilities (docker)', () => {
  const asks = { maxCpuTime: 30, maxMemory: 4096 }; // a very generous request

  test('small server: a 2s / 128MB server stops a runaway loop at 2s', async () => {
    const r = await execute(SOLUTIONS.infiniteLoop, asks, { MAX_EXECUTION_TIME: '2', MEMORY_LIMIT_PER_EXECUTION: '128m' });
    expect(r.limitsLine).toContain('2s, 128MB');
    expect(r.stderr).toContain('Execution exceeded 2s');
    expect(r.wallMs).toBeLessThan(40_000);
  });

  test('small server: memory beyond the cap is refused', async () => {
    const r = await execute(SOLUTIONS.memoryHog, asks, { MAX_EXECUTION_TIME: '10', MEMORY_LIMIT_PER_EXECUTION: '128m' });
    expect(r.stderr).toContain('Memory limit exceeded (128MB)');
    expect(r.stdout).not.toContain('survived');
  });

  test('large server: the same program fits and finishes', async () => {
    const r = await execute(SOLUTIONS.memoryHog, asks, { MAX_EXECUTION_TIME: '10', MEMORY_LIMIT_PER_EXECUTION: '1G' });
    expect(r.limitsLine).toContain('10s, 1024MB');
    expect(r.stdout).toContain('survived');
  });

  test('a stricter request wins over a bigger server', async () => {
    const r = await execute(SOLUTIONS.infiniteLoop, { maxCpuTime: 1, maxMemory: 64 }, { MAX_EXECUTION_TIME: '10', MEMORY_LIMIT_PER_EXECUTION: '1G' });
    expect(r.limitsLine).toContain('1s, 64MB');
    expect(r.stderr).toContain('Execution exceeded 1s');
  });

  test('a normal program is not affected by tight limits', async () => {
    const r = await execute(SOLUTIONS.hardcodedSample, { maxCpuTime: 2, maxMemory: 32 }, { MAX_EXECUTION_TIME: '2', MEMORY_LIMIT_PER_EXECUTION: '32m' });
    expect(r.stdout.trim()).toBe('3');
    expect(r.stderr).toBe('');
  });
});

test.describe('limits through the whole platform', () => {
  let world: World;
  let dispose: () => Promise<void>;
  let languageId: string, problemId: string;
  let student: Awaited<ReturnType<typeof loginUser>>;

  test.beforeAll(async () => {
    const admin = await createAdminSession();
    dispose = admin.dispose;
    world = new World(admin.api);
    student = await loginUser('student');
    languageId = await world.language({ name: 'C++ 2s/64MB (e2e)', maxCpuTime: 2, maxMemory: 64 });
    const eventId = await world.liveEvent('limits', languageId);
    // a single visible test so the participant can see the runtime message
    problemId = await world.problem({ title: 'Limits (e2e)', eventId, tests: [SUM_TESTS[0]] });
    await world.register('student', eventId);
  });

  test.afterAll(async () => {
    await world.dispose();
    await dispose();
  });

  test('the time limit configured on the language is enforced', async () => {
    const r = await submitAndWait(student.api, problemId, languageId, SOLUTIONS.infiniteLoop);
    expect(r.executions[0].passed).toBe(false);
    expect(r.executions[0].stderr).toContain('Execution exceeded 2s');
  });

  test('the memory limit configured on the language is enforced', async () => {
    const r = await submitAndWait(student.api, problemId, languageId, SOLUTIONS.memoryHog);
    expect(r.executions[0].passed).toBe(false);
    expect(r.executions[0].stderr).toContain('Memory limit exceeded (64MB)');
  });

  test('a correct solution still passes under the limits', async () => {
    const r = await submitAndWait(student.api, problemId, languageId, SOLUTIONS.sum);
    expect(r.executions[0].passed).toBe(true);
  });
});
