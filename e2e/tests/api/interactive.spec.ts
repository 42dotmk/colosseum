import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createAdminSession, loginUser } from '../../helpers/api';
import { SOLUTIONS, World, submitAndWait } from '../../helpers/world';

const INTERACTOR = fs.readFileSync(path.resolve(import.meta.dirname, '../../../senatus/seed/interactive/binary-search.interactor.cpp'), 'utf8');

// "N secret": the interactor answers "Accepted" when the secret is found within floor(log2 N) + 1 guesses
const TESTS = [
  { input: '16\n9', output: 'Accepted', hidden: false, weight: 1 },
  { input: '1000000\n1', output: 'Accepted', hidden: true, weight: 2 },
  { input: '1000000\n1000000', output: 'Accepted', hidden: true, weight: 2 },
  { input: '2\n2', output: 'Accepted', hidden: true, locked: true, weight: 3 },
];

test.describe('interactive problems', () => {
  let world: World;
  let dispose: () => Promise<void>;
  let student: Awaited<ReturnType<typeof loginUser>>;
  let alice: Awaited<ReturnType<typeof loginUser>>;
  let languageId: string, problemId: string, eventId: string;

  test.beforeAll(async () => {
    const admin = await createAdminSession();
    dispose = admin.dispose;
    world = new World(admin.api);
    student = await loginUser('student');
    alice = await loginUser('alice');
    languageId = await world.language();
    eventId = await world.liveEvent('interactive', languageId);
    problemId = await world.problem({
      title: 'Guess (interactive e2e)',
      eventId,
      points: 100,
      tests: TESTS,
      interactive: { interactorSource: INTERACTOR },
    });
    await world.register('student', eventId);
    await world.register('alice', eventId);
  });

  test.afterAll(async () => {
    await world.dispose();
    await dispose();
  });

  test('a correct binary search is accepted by the interactor on every test', async () => {
    const run = await submitAndWait(student.api, problemId, languageId, SOLUTIONS.binarySearch);
    expect(run.executions).toHaveLength(3); // the locked test is not shown to the participant
    for (const e of run.executions) expect(e.passed, JSON.stringify(e).slice(0, 400)).toBe(true);
  });

  test('a linear search exceeds the query limit and is rejected', async () => {
    const run = await submitAndWait(alice.api, problemId, languageId, SOLUTIONS.linearSearch);
    const sample = run.executions.find((e) => !e.testCase?.hidden);
    expect(sample.passed).toBe(false); // N=16, secret=9 needs 9 queries, the limit is 5
    expect(sample.stderr).toContain('exceeded query limit');
    const hidden = run.executions.filter((e) => e.testCase?.hidden);
    // a linear scan happens to find secret=1 on the first guess, but not secret=1000000 within 20 queries
    expect(hidden.some((e) => !e.passed)).toBe(true);
    // hidden interactions do not reveal the transcript
    for (const e of hidden) {
      expect(e.stdout).toBe('');
      expect(e.stderr).toBe('');
    }
  });


  // The participant's program runs as an unprivileged user and cannot read the test inputs (which contain the
  // secret). This program tries to read every input file and guess the matching secrets directly.
  test('a program that reads the secret from the input files is not accepted', async () => {
    const cheat = [
      '#include <iostream>',
      '#include <fstream>',
      '#include <filesystem>',
      '#include <string>',
      '#include <vector>',
      'namespace fs = std::filesystem;',
      'int main(){long long n;std::cin>>n;std::vector<long long> secrets;',
      'for(auto&e:fs::directory_iterator("/exc/input")){std::ifstream in(e.path());long long a,b;if(in>>a>>b&&a==n)secrets.push_back(b);}',
      'for(long long s:secrets){std::cout<<s<<std::endl;std::string r;std::cin>>r;if(r=="FOUND")return 0;}}',
    ].join('\n');
    const run = await submitAndWait(alice.api, problemId, languageId, cheat);
    // without access to the inputs it cannot find any secret in the allowed number of queries
    expect(run.executions.every((e) => !e.passed)).toBe(true);
  });

  test('the interactor and checker sources are not visible to participants', async () => {
    const res = await student.api.get(`/api/problems/${problemId}?populate=*`);
    expect(res.status).toBe(200);
    expect(res.body.data.isInteractive).toBe(true);
    expect(res.body.data.interactorSource ?? null).toBeNull();
    expect(res.text).not.toContain('Interactor error');
    expect(res.text).not.toContain('max_queries');
    expect(res.text).not.toContain('1000000\\n1000000'); // hidden test inputs
  });

  test('the live score of an interactive problem follows the same weighting rules', async () => {
    const board = (await student.api.get(`/api/events/${eventId}/leaderboard`)).body;
    const row = (board.leaderboard ?? board.rows).find((r: any) => r.user.username === 'student');
    expect(row.totalScore, JSON.stringify(board).slice(0, 600)).toBe(100); // only the visible sample counts live; it passed
  });
});
