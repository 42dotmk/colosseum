import { Api, loginUser, sleep, type UserName } from './api';

type TestCaseSpec = { input: string; output: string; hidden?: boolean; locked?: boolean; weight?: number };

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;

/** Creates data through an admin token and removes everything again in dispose(). */
export class World {
  private created: { type: string; id: string }[] = [];
  constructor(public admin: Api) {}

  private track(type: string, id: string) {
    this.created.push({ type, id });
    return id;
  }

  async language(opts: { name?: string; maxCpuTime?: number; maxMemory?: number } = {}) {
    const res = await this.admin.post('/api/languages?status=published', {
      data: {
        name: opts.name ?? 'C++ (e2e)',
        codeName: 'cpp',
        entrypoint: 'main.cpp',
        defaultMaxCpuTime: opts.maxCpuTime ?? 5,
        defaultMaxMemory: opts.maxMemory ?? 256,
      },
    });
    if (res.status >= 300) throw new Error(`language create failed: ${JSON.stringify(res.body)}`);
    return this.track('languages', res.body.data.documentId);
  }

  async event(opts: { title: string; start: number; end: number; languageId?: string; problems?: string[] }) {
    const res = await this.admin.post('/api/events?status=published', {
      data: {
        title: `E2E ${opts.title} ${Date.now()}`,
        description: 'created by the e2e suite',
        start: new Date(opts.start).toISOString(),
        end: new Date(opts.end).toISOString(),
        registrationMode: 'open',
        ...(opts.languageId ? { supportedLanguages: [opts.languageId] } : {}),
        ...(opts.problems ? { problems: opts.problems } : {}),
      },
    });
    if (res.status >= 300) throw new Error(`event create failed: ${JSON.stringify(res.body)}`);
    return this.track('events', res.body.data.documentId);
  }

  async liveEvent(title: string, languageId?: string) {
    return this.event({ title, start: Date.now() - HOUR, end: Date.now() + 3 * DAY, languageId });
  }
  async endedEvent(title: string, languageId?: string) {
    return this.event({ title, start: Date.now() - 3 * DAY, end: Date.now() - HOUR, languageId });
  }

  async problem(opts: {
    title: string;
    eventId?: string;
    points?: number;
    tests?: TestCaseSpec[];
    interactive?: { interactorSource: string; checkerSource?: string };
    description?: string;
  }) {
    const res = await this.admin.post('/api/problems?status=published', {
      data: {
        title: opts.title,
        description: opts.description ?? `# ${opts.title}\n\nCreated by the e2e suite.`,
        points: opts.points ?? 100,
        ...(opts.eventId ? { event: opts.eventId } : {}),
        ...(opts.interactive
          ? { isInteractive: true, interactorSource: opts.interactive.interactorSource, checkerSource: opts.interactive.checkerSource }
          : {}),
      },
    });
    if (res.status >= 300) throw new Error(`problem create failed: ${JSON.stringify(res.body)}`);
    const id = this.track('problems', res.body.data.documentId);
    for (const [i, t] of (opts.tests ?? []).entries()) {
      const tc = await this.admin.post('/api/test-cases?status=published', {
        data: { input: t.input, output: t.output, hidden: !!t.hidden, locked: !!t.locked, weight: t.weight ?? i + 1, problem: id },
      });
      if (tc.status >= 300) throw new Error(`test case create failed: ${JSON.stringify(tc.body)}`);
      this.track('test-cases', tc.body.data.documentId);
    }
    return id;
  }

  async register(userName: UserName, eventId: string) {
    const u = await loginUser(userName);
    const res = await this.admin.post('/api/event-registrations', {
      data: { event: eventId, user: u.documentId, registeredAt: new Date().toISOString() },
    });
    if (res.status >= 300) throw new Error(`registration failed: ${JSON.stringify(res.body)}`);
    this.track('event-registrations', res.body.data.documentId);
  }

  async dispose() {
    for (const { type, id } of [...this.created].reverse()) {
      if (type === 'problems') {
        const subs = await this.admin.get(`/api/submissions?filters[problem][documentId][$eq]=${id}&pagination[pageSize]=100`);
        for (const s of subs.body?.data ?? []) {
          const ex = await this.admin.get(`/api/executions?filters[submission][documentId][$eq]=${s.documentId}&pagination[pageSize]=100`);
          for (const e of ex.body?.data ?? []) await this.admin.del(`/api/executions/${e.documentId}`);
          await this.admin.del(`/api/submissions/${s.documentId}`);
        }
      }
      await this.admin.del(`/api/${type}/${id}`);
    }
    this.created = [];
  }
}

export type SubmitResult = { id: string; executions: any[]; createStatus: number; createBody: any };

/** Submit as a user and wait until every execution has been processed by the executioner. */
export const submitAndWait = async (
  user: Api,
  problemId: string,
  languageId: string,
  code: string,
  opts: { practice?: boolean; timeoutMs?: number } = {},
): Promise<SubmitResult> => {
  const created = await user.post('/api/submissions', {
    data: { problem: problemId, code, language: languageId, ...(opts.practice ? { mode: 'practice' } : {}) },
  });
  if (created.status !== 200) return { id: '', executions: [], createStatus: created.status, createBody: created.body };
  const id = created.body.data.documentId as string;
  const run = await user.get(`/api/submissions/submit?id=${id}`);
  if (run.status >= 300) return { id, executions: [], createStatus: run.status, createBody: run.body };

  const deadline = Date.now() + (opts.timeoutMs ?? 120_000);
  while (Date.now() < deadline) {
    await sleep(1500);
    const ex = await user.get(`/api/executions?filters[submission][documentId][$eq]=${id}&populate[testCase]=true&pagination[pageSize]=100`);
    const rows = ex.body?.data ?? [];
    if (rows.length && rows.every((e: any) => e.processed)) {
      return { id, executions: rows, createStatus: 200, createBody: created.body };
    }
  }
  const last = await user.get(`/api/executions?filters[submission][documentId][$eq]=${id}&populate[testCase]=true&pagination[pageSize]=100`);
  throw new Error(`executions for submission ${id} did not finish in time: ${JSON.stringify((last.body?.data ?? []).map((e: any) => ({ processed: e.processed, passed: e.passed, stderr: String(e.stderr).slice(0, 120) })))} status=${last.status}`);
};

// ------------------------------------------------------------------ C++ sources used by the tests
export const SOLUTIONS = {
  sum: '#include <iostream>\nint main(){long long a,b;std::cin>>a>>b;std::cout<<a+b<<"\\n";}',
  // prints the sample answer for every input: passes only the visible sample
  hardcodedSample: '#include <iostream>\nint main(){std::cout<<"3\\n";}',
  infiniteLoop: '#include <iostream>\nint main(){volatile unsigned long long x=0;while(true){x=x+1;}}',
  // touches ~400MB so it has to be stopped by the memory limit
  memoryHog:
    '#include <vector>\n#include <cstring>\n#include <iostream>\nint main(){std::vector<char*> v;for(int i=0;i<400;i++){char*p=new char[1<<20];std::memset(p,1,1<<20);v.push_back(p);}std::cout<<"survived\\n";}',
  compileError: 'int main(){ this is not c++ }',
  binarySearch:
    '#include <iostream>\n#include <string>\nusing namespace std;\nint main(){long long n;cin>>n;long long lo=1,hi=n;while(lo<=hi){long long mid=(lo+hi)/2;cout<<mid<<endl;string r;cin>>r;if(r=="FOUND")return 0;if(r=="HIGHER")lo=mid+1;else if(r=="LOWER")hi=mid-1;else return 0;}}',
  linearSearch:
    '#include <iostream>\n#include <string>\nusing namespace std;\nint main(){long long n;cin>>n;for(long long g=1;g<=n;g++){cout<<g<<endl;string r;cin>>r;if(r=="FOUND")return 0;if(r=="TOO_MANY"||r=="OUT_OF_RANGE")return 0;}}',
};

export const SUM_TESTS = [
  { input: '1 2\n', output: '3\n', hidden: false, locked: false, weight: 1 },
  { input: '10 20\n', output: '30\n', hidden: true, locked: false, weight: 2 },
  { input: '100 200\n', output: '300\n', hidden: true, locked: true, weight: 3 },
];
