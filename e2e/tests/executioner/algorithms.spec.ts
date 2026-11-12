import { test, expect } from '@playwright/test';
import { createAdminSession, loginUser } from '../../helpers/api';
import { World, submitAndWait } from '../../helpers/world';

/**
 * Algorithmic complexity through the whole stack (Strapi, queue, executioner, runtime image).
 * Problem: maximum sum of a contiguous subarray, CPU limit 1 s. Three tests of growing size:
 *   n = 100      every solution fits
 *   n = 10 000   O(n^2) fits (5e7 steps), O(n^3) does not (1.7e11 steps)
 *   n = 200 000  only O(n) fits (O(n^2) is 2e10 steps)
 * The gaps are 20x or more, so the verdicts are decided by the algorithm and not by the machine.
 */
const LCG = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) % 2147483648), seed);
const makeCase = (n: number, seed: number) => {
  const next = LCG(seed);
  const values = Array.from({ length: n }, () => (next() % 19) - 9);
  let best = values[0];
  let current = 0;
  for (const v of values) {
    current = Math.max(v, current + v);
    best = Math.max(best, current);
  }
  return { input: `${n}\n${values.join(' ')}\n`, output: `${best}\n` };
};

const HEAD = '#include <iostream>\n#include <vector>\n#include <algorithm>\nint main(){int n;std::cin>>n;std::vector<long long>a(n);for(auto&x:a)std::cin>>x;long long best=a[0];\n';
const TAIL = '\nstd::cout<<best<<"\\n";}';
const SOLUTIONS = {
  linear: HEAD + 'long long cur=0;for(int i=0;i<n;i++){cur=std::max(a[i],cur+a[i]);best=std::max(best,cur);}' + TAIL,
  quadratic: HEAD + 'for(int i=0;i<n;i++){long long s=0;for(int j=i;j<n;j++){s+=a[j];best=std::max(best,s);}}' + TAIL,
  cubic:
    HEAD +
    'for(int i=0;i<n;i++)for(int j=i;j<n;j++){long long s=0;for(int k=i;k<=j;k++)s+=a[k];best=std::max(best,s);}' +
    TAIL,
};

test.describe('complexity classes are told apart by the time limit', () => {
  let world: World;
  let dispose: () => Promise<void>;
  let student: Awaited<ReturnType<typeof loginUser>>;
  let problemId: string;
  let languageId: string;

  test.beforeAll(async () => {
    const admin = await createAdminSession();
    dispose = admin.dispose;
    world = new World(admin.api);
    student = await loginUser('student');
    languageId = await world.language({ name: 'C++ 1s/256MB (algorithms)', maxCpuTime: 1, maxMemory: 256 });
    const eventId = await world.liveEvent('algorithms', languageId);
    problemId = await world.problem({
      title: 'Maximum subarray sum',
      eventId,
      tests: [
        { ...makeCase(100, 1), weight: 1 },
        { ...makeCase(10_000, 2), weight: 2 },
        { ...makeCase(200_000, 3), weight: 3 },
      ],
    });
    await world.register('student', eventId);
  });

  test.afterAll(async () => {
    await world.dispose();
    await dispose();
  });

  const byWeight = (executions: any[]) => [...executions].sort((a, b) => (a.testCase?.weight ?? 0) - (b.testCase?.weight ?? 0));

  for (const [name, code, expected] of [
    ['O(n)', SOLUTIONS.linear, [true, true, true]],
    ['O(n^2)', SOLUTIONS.quadratic, [true, true, false]],
    ['O(n^3)', SOLUTIONS.cubic, [true, false, false]],
  ] as const) {
    test(`${name} passes exactly the sizes it should`, async () => {
      const r = await submitAndWait(student.api, problemId, languageId, code, { timeoutMs: 240_000 });
      const ex = byWeight(r.executions);
      expect(ex.length).toBe(3);
      expect(ex.map((e) => e.passed), ex.map((e) => String(e.stderr).slice(0, 80)).join(' | ')).toEqual(expected);
      for (const e of ex.filter((e) => !e.passed)) expect(e.stderr).toContain('Execution exceeded 1s');
    });
  }

  test('the same verdicts again, so the result is repeatable', async () => {
    const r = await submitAndWait(student.api, problemId, languageId, SOLUTIONS.quadratic, { timeoutMs: 240_000 });
    expect(byWeight(r.executions).map((e) => e.passed)).toEqual([true, true, false]);
  });
});
