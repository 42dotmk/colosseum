import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execute, executeMany, PROGRAMS, type Outcome } from '../../helpers/executioner';

/**
 * Repeatability: the same code run 100 times must give the same verdict every time and almost the same CPU
 * time and peak memory. Each case reports its statistics (test annotations and reports/repeatability.jsonl).
 *
 * The bounds are set for a normal development machine; a quiet homogeneous judging host is much tighter.
 */
const RUNS = 100;
const REF = { MAX_EXECUTION_TIME: '60', MEMORY_LIMIT_PER_EXECUTION: '2G' };

const stats = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { n: xs.length, min: sorted[0], median: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1], mean, cv: mean ? sd / mean : 0 };
};
const fmt = (s: ReturnType<typeof stats>, unit: string) =>
  `n=${s.n} min=${s.min.toFixed(3)}${unit} median=${s.median.toFixed(3)}${unit} p95=${s.p95.toFixed(3)}${unit} max=${s.max.toFixed(3)}${unit} cv=${(s.cv * 100).toFixed(1)}%`;

// one line per case, appended as soon as the case is measured (a failed case restarts the worker)
const REPORT = path.join('reports', 'repeatability.jsonl');
test.beforeAll(() => {
  fs.mkdirSync('reports', { recursive: true });
});

const check = (name: string, runs: Outcome[], bounds: { timeCv: number; timeMaxOverMedian: number; memSpreadMb: number }) => {
  // 1. the same verdict every time
  const failures = runs.filter((r) => !r.passed);
  expect(failures.length, `${name}: ${failures.length} of ${runs.length} runs failed, first: ${failures[0]?.stderr}`).toBe(0);
  expect(new Set(runs.map((r) => r.stdout.trim())).size, `${name}: output differs between runs`).toBe(1);

  // 2. CPU time and 3. peak memory stay together
  const time = stats(runs.map((r) => r.time!));
  const memory = stats(runs.map((r) => r.memory!));
  const line = `${name} | time ${fmt(time, 's')} | memory ${fmt(memory, 'MB')}`;
  test.info().annotations.push({ type: name, description: line });
  fs.appendFileSync(REPORT, `${JSON.stringify({ name, time, memory })}\n`);
  console.log(line);
  expect(time.cv, `${name}: CPU time spread`).toBeLessThan(bounds.timeCv);
  expect(time.max / time.median, `${name}: slowest vs median`).toBeLessThan(bounds.timeMaxOverMedian);
  expect(memory.max - memory.min, `${name}: peak memory spread (MB)`).toBeLessThanOrEqual(bounds.memSpreadMb);
};

test.describe(`${RUNS} runs of the same code`, () => {
  test.setTimeout(25 * 60_000);

  test('CPU-bound program, a new container every time', async () => {
    const runs: Outcome[] = [];
    for (let i = 0; i < RUNS; i++) runs.push(await execute(PROGRAMS.cpuWork(300_000_000), { maxCpuTime: 5, maxMemory: 256 }, REF));
    check('cpu-bound, separate containers', runs, { timeCv: 0.2, timeMaxOverMedian: 2.2, memSpreadMb: 0.5 });
  });

  test('memory-bound program (50 MB touched), a new container every time', async () => {
    const runs: Outcome[] = [];
    for (let i = 0; i < RUNS; i++) runs.push(await execute(PROGRAMS.alloc(50), { maxCpuTime: 5, maxMemory: 256 }, REF));
    const memory = stats(runs.map((r) => r.memory!));
    // it touched 50 MB, so the peak is just above that, and the same every time
    expect(memory.median).toBeGreaterThan(50);
    expect(memory.median).toBeLessThan(60);
    check('memory-bound 50MB, separate containers', runs, { timeCv: 0.4, timeMaxOverMedian: 4, memSpreadMb: 0.5 });
  });

  test('an O(n^2) algorithm on 30 000 numbers, a new container every time', async () => {
    const n = 30_000;
    const values = Array.from({ length: n }, (_, i) => ((i * 7919) % 19) - 9);
    const input = `${n}\n${values.join(' ')}\n`;
    const code =
      '#include <iostream>\n#include <vector>\n#include <algorithm>\nint main(){int n;std::cin>>n;std::vector<long long>a(n);for(auto&x:a)std::cin>>x;long long best=a[0];for(int i=0;i<n;i++){long long s=0;for(int j=i;j<n;j++){s+=a[j];best=std::max(best,s);}}volatile long long sink=best;(void)sink;std::cout<<"ok"<<std::endl;}';
    const runs: Outcome[] = [];
    for (let i = 0; i < RUNS; i++) runs.push(await execute(code, { maxCpuTime: 5, maxMemory: 256 }, REF, input));
    check('O(n^2) n=30000, separate containers', runs, { timeCv: 0.2, timeMaxOverMedian: 2.2, memSpreadMb: 0.5 });
  });

  test('100 test cases of one submission run in the same container', async () => {
    const runs = await executeMany(PROGRAMS.cpuWork(100_000_000), { maxCpuTime: 5, maxMemory: 256 }, REF, Array(RUNS).fill(''));
    expect(runs).toHaveLength(RUNS);
    check('cpu-bound, one container, 100 inputs', runs, { timeCv: 0.12, timeMaxOverMedian: 1.6, memSpreadMb: 0.5 });
  });

  test('100 runs while 4 jobs execute at the same time (the default concurrency)', async () => {
    const runs: Outcome[] = [];
    for (let round = 0; round < RUNS / 4; round++) {
      runs.push(...(await Promise.all(Array.from({ length: 4 }, () => execute(PROGRAMS.cpuWork(300_000_000), { maxCpuTime: 5, maxMemory: 256 }, REF)))));
    }
    check('cpu-bound, 4 concurrent', runs, { timeCv: 0.5, timeMaxOverMedian: 3.5, memSpreadMb: 0.5 });
  });
});
