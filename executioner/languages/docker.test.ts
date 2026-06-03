import { describe, it, expect } from 'vitest';
import { execute } from './docker.js';

const deriveVerdict = (result: any, expectedOutput: string): string => {
  const raw: string | null = result.verdict ?? null;
  if (raw === 'TLE') return 'TLE';
  if (raw === 'RTE') return 'RTE';
  if (raw === 'CE')  return 'CE';
  if (raw === 'MLE') return 'MLE';
  const normalize = (s: string) => (s ?? '').replace(/\r\n/g, '\n').trim();
  return normalize(result.stdout) === normalize(expectedOutput) ? 'AC' : 'WA';
};


const CPP_SUM = `
#include <iostream>
int main() {
    long long a, b;
    std::cin >> a >> b;
    std::cout << a + b << std::endl;
    return 0;
}
`;

// Outputs a+b+1 — intentionally wrong
const CPP_WRONG_SUM = `
#include <iostream>
int main() {
    long long a, b;
    std::cin >> a >> b;
    std::cout << a + b + 1 << std::endl;
    return 0;
}
`;

const CPP_INFINITE_LOOP = `
int main() {
    while (true) {}
    return 0;
}
`;

const CPP_SEGFAULT = `
int main() {
    int* p = nullptr;
    *p = 42;
    return 0;
}
`;

const CPP_EXCEPTION = `
#include <stdexcept>
int main() {
    throw std::runtime_error("unhandled");
    return 0;
}
`;

const CPP_NONZERO_EXIT = `
int main() {
    return 42;
}
`;

const CPP_SYNTAX_ERROR = `
#include <iostream>
int main() {
    this is not valid cpp;
    return 0;
}
`;

// Echoes each line of input back — used for the multi-test-case test
const CPP_ECHO = `
#include <iostream>
#include <string>
int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::cout << line << "\\n";
    }
    return 0;
}
`;

const BASE_OPTS = { language: 'cpp', entrypointFile: 'main.cpp' };
// 1-second limit so TLE tests finish quickly
const FAST_OPTS = { ...BASE_OPTS, timeLimitSeconds: 1 };

function makeInput(filename: string, content: string) {
  return { filename, content, metadata: { executionId: filename } };
}

describe('C++ executor — verdict coverage', () => {
  it('AC: sum problem with correct expected output', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_SUM }],
      [makeInput('tc1', '3 5\n')],
      BASE_OPTS,
    ))!;

    expect(result).toHaveLength(1);
    expect(deriveVerdict(result[0], '8')).toBe('AC');
    expect(result[0].verdict).toBe('OK');
  });

  it('WA: sum program produces wrong output', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_WRONG_SUM }],
      [makeInput('tc1', '3 5\n')],
      BASE_OPTS,
    ))!;

    expect(result[0].verdict).toBe('OK');
    expect(deriveVerdict(result[0], '8')).toBe('WA');
  });

  it('TLE: infinite loop is killed within the time limit', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_INFINITE_LOOP }],
      [makeInput('tc1', '\n')],
      FAST_OPTS,
    ))!;

    expect(result[0].verdict).toBe('TLE');
    expect(deriveVerdict(result[0], '')).toBe('TLE');
  });

  it('RTE: null-pointer dereference (segfault) is reported as RTE', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_SEGFAULT }],
      [makeInput('tc1', '\n')],
      BASE_OPTS,
    ))!;

    expect(result[0].verdict).toBe('RTE');
    expect(deriveVerdict(result[0], '')).toBe('RTE');
  });

  it('RTE: unhandled exception is reported as RTE', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_EXCEPTION }],
      [makeInput('tc1', '\n')],
      BASE_OPTS,
    ))!;

    expect(result[0].verdict).toBe('RTE');
  });

  it('RTE: non-zero exit code is reported as RTE', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_NONZERO_EXIT }],
      [makeInput('tc1', '\n')],
      BASE_OPTS,
    ))!;

    expect(result[0].verdict).toBe('RTE');
  });

  it('CE: compilation error returns CE for all test cases', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_SYNTAX_ERROR }],
      [makeInput('tc1', '\n'), makeInput('tc2', '\n')],
      BASE_OPTS,
    ))!;

    expect(result).toHaveLength(2);
    expect(result[0].verdict).toBe('CE');
    expect(result[1].verdict).toBe('CE');
  });

  it('time and memoryKb are populated for a clean run', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_SUM }],
      [makeInput('tc1', '100 200\n')],
      BASE_OPTS,
    ))!;

    expect(result[0].time).toBeTypeOf('number');
    expect(result[0].time).toBeGreaterThanOrEqual(0);
    expect(result[0].memoryKb).toBeTypeOf('number');
    expect(result[0].memoryKb).toBeGreaterThan(0);
  });

  it('multiple test cases: each gets its own verdict', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_ECHO }],
      [
        makeInput('tc1', 'hello\n'),
        makeInput('tc2', 'world\n'),
        makeInput('tc3', 'foo\n'),
      ],
      BASE_OPTS,
    ))!;

    expect(result).toHaveLength(3);
    expect(deriveVerdict(result[0], 'hello')).toBe('AC');
    expect(deriveVerdict(result[1], 'world')).toBe('AC');
    expect(deriveVerdict(result[2], 'wrong')).toBe('WA');

    for (const r of result) {
      expect(r.verdict).toBe('OK');
    }
  });

  it('MLE (soft): program completing but exceeding RSS limit is reported as MLE', async () => {
    // Allocates 40 MB — above the 32 MB limit but below the Docker ceiling
    // (32 + 16 overhead = 48 MB), so the process exits cleanly with code 0.
    // MLE is caught by the post-execution RSS check, not a Docker OOM kill.
    //
    // The loop + printf is required: -O2 eliminates dead allocations and plain
    // memset on a local pointer, but a loop whose accumulator is printed cannot
    // be removed without changing observable behaviour.
    const CPP_ALLOC_40MB = `
#include <cstdio>
int main() {
    const int MB = 1024 * 1024;
    char* p = new char[40 * MB];
    int sum = 0;
    for (int i = 0; i < 40 * MB; i += 4096) {
        p[i] = (char)i;
        sum += (unsigned char)p[i];
    }
    printf("%d\\n", sum);
    return 0;
}
`;
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_ALLOC_40MB }],
      [makeInput('tc1', '\n')],
      { ...BASE_OPTS, memoryLimitMb: 32 },
    ))!;

    expect(result[0].verdict).toBe('MLE');
    // Soft MLE: program finished, actual RSS is available and should be above
    // the problem limit, showing exactly how far over it went.
    expect(result[0].memoryKb).toBeGreaterThan(32 * 1024);
  });

  it('MLE: program exceeding memory limit is killed and reported as MLE', async () => {
    // Allocates 128 MB in 1 MB chunks with actual writes so the OS can't
    // defer the allocation. With a 32 MB limit and swap disabled this reliably
    // OOM-kills the container (exit 137) before the program finishes.
    const CPP_ALLOC_128MB = `
#include <cstring>
int main() {
    const int MB = 1024 * 1024;
    for (int i = 0; i < 128; i++) {
        volatile char* p = new char[MB];
        memset((void*)p, i, MB);
    }
    return 0;
}
`;
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_ALLOC_128MB }],
      [makeInput('tc1', '\n')],
      { ...BASE_OPTS, memoryLimitMb: 32 },
    ))!;

    expect(result[0].verdict).toBe('MLE');
    // Hard MLE: process was OOM-killed mid-allocation so the RSS at kill time
    // reflects the Docker ceiling, not the program's real peak. We cap it at
    // the problem limit so callers get a clean lower-bound signal.
    expect(result[0].memoryKb).toBe(32 * 1024);
  });

  it('per-problem time limit is respected (custom timeLimitSeconds)', async () => {
    const result = (await execute(
      [{ filename: 'main.cpp', content: CPP_INFINITE_LOOP }],
      [makeInput('tc1', '\n')],
      { ...BASE_OPTS, timeLimitSeconds: 2 },
    ))!;

    expect(result[0].verdict).toBe('TLE');
    // Should finish in roughly 2 seconds, definitely under 2.1
    expect(result[0].time).toBeLessThan(2.1);
  });
});
