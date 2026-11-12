import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
export const EXECUTIONER_DIR = path.resolve(import.meta.dirname, '../../executioner');
export const TSX = path.join(EXECUTIONER_DIR, 'node_modules/tsx/dist/cli.mjs');

export type Request = { maxCpuTime?: number; maxMemory?: number };
export type Outcome = {
  stdout: string;
  stderr: string;
  /** execution time reported by the runtime (seconds), null when the program was killed */
  time: number | null;
  /** peak resident memory of the program (MB) */
  memory: number | null;
  /** wall time of the whole job including compile and container start */
  wallMs: number;
  limitsLine?: string;
  passed: boolean;
};

/**
 * Runs one job directly through the executioner (no queue) as a server with the given capabilities.
 * The same code path as the queue worker uses, so limits, isolation and messages are the real ones.
 * Several inputs run one after the other in the same container, like the test cases of one submission.
 */
export const executeMany = async (
  code: string,
  request: Request,
  serverEnv: Record<string, string> = {},
  inputs: string[] = [''],
): Promise<Outcome[]> => {
  const job = {
    sources: [{ filename: 'main.cpp', content: code }],
    input: inputs.map((content, i) => ({ filename: `t${i + 1}`, content, metadata: { id: i + 1 } })),
    options: { language: 'cpp', entrypointFile: 'main.cpp', ...request },
  };
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-job-')), 'job.json');
  fs.writeFileSync(file, JSON.stringify(job));
  const started = Date.now();
  const { stdout } = await run(process.execPath, [TSX, 'tools/exec-cli.ts', file], {
    cwd: EXECUTIONER_DIR,
    env: { ...process.env, MAX_EXECUTION_TIME: '60', MEMORY_LIMIT_PER_EXECUTION: '2G', ...serverEnv },
    maxBuffer: 200 * 1024 * 1024,
  });
  const lines = stdout.split(/\r?\n/);
  const line = lines.find((l) => l.startsWith('RESULT_JSON:'));
  if (!line) throw new Error(`no result from executioner: ${stdout.slice(-2000)}`);
  const results = JSON.parse(line.slice('RESULT_JSON:'.length)) as any[];
  const limitsLine = lines.find((l) => l.includes('Limits for this execution'));
  return results.map((result) => ({
    ...result,
    wallMs: Date.now() - started,
    limitsLine,
    passed: String(result.stdout).trim() === 'ok' && !result.stderr,
  }));
};

export const execute = async (
  code: string,
  request: Request,
  serverEnv: Record<string, string> = {},
  input = '',
): Promise<Outcome> => (await executeMany(code, request, serverEnv, [input]))[0];

// ------------------------------------------------------------------ test programs (all print "ok" on success)
export const PROGRAMS = {
  hello: '#include <iostream>\nint main(){std::cout<<"ok\\n";}',

  /** allocates and touches `mb` megabytes */
  alloc: (mb: number) =>
    `#include <vector>\n#include <cstring>\n#include <iostream>\nint main(){std::vector<char*> v;for(int i=0;i<${mb};i++){char*p=new char[1<<20];std::memset(p,1,1<<20);v.push_back(p);}std::cout<<"ok\\n";}`,

  /** a global array that is never touched: costs address space but (almost) no resident memory */
  untouchedGlobal: (mb: number) =>
    `#include <iostream>\nstatic volatile char big[${mb}<<20];\nint main(){big[5]=1;std::cout<<"ok\\n";}`,

  /** busy wait for `ms` wall-clock milliseconds */
  busyFor: (ms: number) =>
    `#include <chrono>\n#include <iostream>\nint main(){auto s=std::chrono::steady_clock::now();volatile unsigned long long x=0;while(std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::steady_clock::now()-s).count()<${ms})x=x+1;std::cout<<"ok\\n";}`,

  sleepFor: (ms: number) =>
    `#include <chrono>\n#include <thread>\n#include <iostream>\nint main(){std::this_thread::sleep_for(std::chrono::milliseconds(${ms}));std::cout<<"ok\\n";}`,

  /** a fixed amount of CPU work (about 0.7s on the reference machine for 5e8): slower hardware takes longer */
  cpuWork: (iterations: number) =>
    `#include <iostream>\nint main(){unsigned long long x=1;for(unsigned long long i=0;i<${iterations}ULL;i++){x^=x<<13;x^=x>>7;x^=x<<17;}std::cout<<"ok"<<(x==12345?"!":"")<<std::endl;}`,

  infiniteOutput: '#include <cstdio>\nint main(){while(true)std::puts("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");}',

  forkBomb: '#include <unistd.h>\nint main(){while(true)fork();}',

  /** unbounded recursion: stack overflow */
  stackOverflow: '#include <iostream>\nint f(int n){volatile char pad[4096];pad[0]=n;return f(n+1)+pad[0];}\nint main(){std::cout<<f(0);}',

  /** reads from an input that never gets data */
  readsInput: '#include <iostream>\nint main(){long long a;std::cin>>a;std::cout<<"ok\\n";}',
};

export const elapsedSeconds = (o: Outcome) => (o.time ?? NaN) as number;
