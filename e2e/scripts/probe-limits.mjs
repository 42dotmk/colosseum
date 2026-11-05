/**
 * Probes how the executioner behaves at tight limits (prints a table). Usage: node scripts/probe-limits.mjs
 * Not a test: it is used to find where the limit mechanism is accurate and where it is not.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const EXEC = path.resolve(import.meta.dirname, '../../executioner');
const TSX = path.join(EXEC, 'node_modules/tsx/dist/cli.mjs');

const run = (code, request, env = {}) => {
  const job = {
    sources: [{ filename: 'main.cpp', content: code }],
    input: [{ filename: 't1', content: '', metadata: {} }],
    options: { language: 'cpp', entrypointFile: 'main.cpp', ...request },
  };
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'probe-')), 'job.json');
  fs.writeFileSync(file, JSON.stringify(job));
  const t0 = Date.now();
  const out = execFileSync(process.execPath, [TSX, 'tools/exec-cli.ts', file], {
    cwd: EXEC,
    env: { ...process.env, MAX_EXECUTION_TIME: '60', MEMORY_LIMIT_PER_EXECUTION: '2G', ...env },
    encoding: 'utf8',
    maxBuffer: 1e7,
  });
  const line = out.split('\n').find((l) => l.startsWith('RESULT_JSON:'));
  const [r] = JSON.parse(line.slice(12));
  return { ...r, wall: Date.now() - t0 };
};

const alloc = (mb) =>
  `#include <vector>\n#include <cstring>\n#include <iostream>\nint main(){std::vector<char*> v;for(int i=0;i<${mb};i++){char*p=new char[1<<20];std::memset(p,1,1<<20);v.push_back(p);}std::cout<<"ok\\n";}`;
const busy = (ms) =>
  `#include <chrono>\n#include <iostream>\nint main(){auto s=std::chrono::steady_clock::now();volatile unsigned long long x=0;while(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-s).count()<${ms})x=x+1;std::cout<<"ok\\n";}`;
const sleeper = (ms) =>
  `#include <chrono>\n#include <thread>\n#include <iostream>\nint main(){std::this_thread::sleep_for(std::chrono::milliseconds(${ms}));std::cout<<"ok\\n";}`;
const hello = '#include <iostream>\nint main(){std::cout<<"ok\\n";}';

const cases = [
  ['mem 10MB  hello', hello, { maxMemory: 10, maxCpuTime: 5 }],
  ['mem 10MB  alloc 1MB', alloc(1), { maxMemory: 10, maxCpuTime: 5 }],
  ['mem 10MB  alloc 5MB', alloc(5), { maxMemory: 10, maxCpuTime: 5 }],
  ['mem 10MB  alloc 9MB', alloc(9), { maxMemory: 10, maxCpuTime: 5 }],
  ['mem 10MB  alloc 15MB (must fail)', alloc(15), { maxMemory: 10, maxCpuTime: 5 }],
  ['mem 100MB alloc 50MB', alloc(50), { maxMemory: 100, maxCpuTime: 5 }],
  ['mem 100MB alloc 90MB', alloc(90), { maxMemory: 100, maxCpuTime: 5 }],
  ['mem 100MB alloc 110MB (must fail)', alloc(110), { maxMemory: 100, maxCpuTime: 5 }],
  ['mem 100MB alloc 400MB (must fail)', alloc(400), { maxMemory: 100, maxCpuTime: 5 }],
  ['time 100ms hello', hello, { maxCpuTime: 0.1, maxMemory: 256 }],
  ['time 100ms busy 30ms', busy(30), { maxCpuTime: 0.1, maxMemory: 256 }],
  ['time 100ms busy 300ms (must fail)', busy(300), { maxCpuTime: 0.1, maxMemory: 256 }],
  ['time 3s busy 2500ms', busy(2500), { maxCpuTime: 3, maxMemory: 256 }],
  ['time 3s busy 3500ms (must fail)', busy(3500), { maxCpuTime: 3, maxMemory: 256 }],
  ['time 3s sleep 5000ms (wall vs cpu)', sleeper(5000), { maxCpuTime: 3, maxMemory: 256 }],
];

const only = process.argv[2];
for (const [name, code, req] of cases) {
  if (only && !name.includes(only)) continue;
  const r = run(code, req);
  const verdict = r.stdout.trim() === 'ok' ? 'OK      ' : 'FAILED  ';
  console.log(`${verdict}${name.padEnd(40)} time=${String(r.time).padEnd(7)} wall=${String(r.wall).padEnd(6)} ${(r.stderr || '').replace(/\n/g, ' ').slice(0, 110)}`);
}
