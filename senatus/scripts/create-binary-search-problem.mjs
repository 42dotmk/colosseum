/**
 * Creates a "Binary Search (Interactive)" problem in the first ongoing event.
 * Usage:
 *   API_TOKEN=<token> node create-binary-search-problem.mjs
 *   or just: node create-binary-search-problem.mjs  (will prompt for email/password)
 */

import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const BASE_URL = process.env.STRAPI_URL || 'http://localhost:1337/api';

// ---------------------------------------------------------------------------
// Interactor source – binary search judge
// Interactor contract:
//   argv[1]  = path to test-case input file ("N secret\n")
//   stdin    = solution's stdout (guesses, one integer per line)
//   stdout   = responses to solution: HIGHER | LOWER | FOUND | TOO_MANY | OUT_OF_RANGE
//   exit 0   = Accepted
//   exit 1   = Wrong Answer
//   stderr   = human-readable verdict message shown in the execution stderr
// ---------------------------------------------------------------------------
const INTERACTOR_SOURCE = `#include <bits/stdc++.h>
using namespace std;

int main(int argc, char* argv[]) {
    if (argc < 2) {
        cerr << "Interactor error: no input file provided" << endl;
        return 2;
    }

    ifstream fin(argv[1]);
    if (!fin.is_open()) {
        cerr << "Interactor error: cannot open input file" << endl;
        return 2;
    }

    long long N, secret;
    fin >> N >> secret;
    fin.close();

    if (secret < 1 || secret > N) {
        cerr << "Interactor error: invalid test case (secret=" << secret
             << " out of [1," << N << "])" << endl;
        return 2;
    }

    int max_queries = (int)floor(log2((double)N)) + 1;
    int queries = 0;
    long long guess;

    // Flush stdout after every write so the solution sees responses immediately
    cout << unitbuf;

    // Send N to the participant program first.
    // Expected participant contract:
    //   1) read N
    //   2) print guess
    //   3) read HIGHER/LOWER/FOUND
    cout << N << endl;

    while (cin >> guess) {
        queries++;

        if (queries > max_queries) {
            cout << "TOO_MANY" << endl;
            cerr << "Wrong Answer: exceeded query limit (" << max_queries << ")" << endl;
            return 1;
        }

        if (guess < 1 || guess > N) {
            cout << "OUT_OF_RANGE" << endl;
            cerr << "Wrong Answer: guess " << guess
                 << " is outside valid range [1," << N << "]" << endl;
            return 1;
        }

        if (guess == secret) {
            cout << "FOUND" << endl;
            cerr << "Accepted: found in " << queries << "/" << max_queries << " queries" << endl;
            return 0;
        } else if (guess < secret) {
            cout << "HIGHER" << endl;
        } else {
            cout << "LOWER" << endl;
        }
    }

    cerr << "Wrong Answer: solution terminated without finding the answer" << endl;
    return 1;
}
`;

// ---------------------------------------------------------------------------
// Problem description (Markdown)
// ---------------------------------------------------------------------------
const DESCRIPTION = `## Binary Search (Interactive)

You are given a hidden integer \`secret\` in the range **[1, N]**.

Your program must find \`secret\` by asking queries. For each query, output a single integer (your guess). The judge will respond with one of:

| Response | Meaning |
|---|---|
| \`HIGHER\` | The secret is **greater** than your guess |
| \`LOWER\` | The secret is **smaller** than your guess |
| \`FOUND\` | Your guess is **correct** — interaction ends |
| \`TOO_MANY\` | You exceeded the allowed number of queries — Wrong Answer |
| \`OUT_OF_RANGE\` | Your guess was outside [1, N] — Wrong Answer |

### Input format
On the **first line** of standard input you receive a single integer **N** — the upper bound of the range.

### Output format
For each query, print a single integer to standard output followed by a newline. **Flush after each guess** (e.g. \`cout << guess << endl;\` or \`cout << flush;\`).

### Query limit
You may ask at most **⌊log₂(N)⌋ + 1** queries.

### Example interaction
\`\`\`
→ (your program reads)  N = 16
← (your program writes) 8
→ (judge responds)      HIGHER
← 12
→                       LOWER
← 10
→                       LOWER
← 9
→                       FOUND
\`\`\`
`;

// ---------------------------------------------------------------------------
// Test cases: "N secret" → expected output "Accepted"
// ---------------------------------------------------------------------------
const TEST_CASES = [
  // [input, description, hidden]
  ['16\n9',          'Small range (N=16), secret=9 — demo/visible',       false],
  ['1000\n42',       'Medium range (N=1000), secret=42',                   false],
  ['1000000\n1',     'Large range (N=1M), minimum secret',                 true],
  ['1000000\n1000000', 'Large range (N=1M), maximum secret',               true],
  ['1000000\n500000', 'Large range (N=1M), middle secret',                  true],
  ['2\n1',           'Minimal range (N=2), secret=1',                      true],
  ['2\n2',           'Minimal range (N=2), secret=2',                      true],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    console.error(`API error ${res.status} at ${url}:`, JSON.stringify(json, null, 2));
    throw new Error(`HTTP ${res.status}`);
  }
  return json;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  let authHeader;
  let useAdminApi = false;

  if (process.env.API_TOKEN) {
    authHeader = `Bearer ${process.env.API_TOKEN}`;
    console.log('Using API_TOKEN from environment.');
  } else {
    const rl = readline.createInterface({ input, output });
    const email = (await rl.question('Admin email [admin@colosseum.local]: ')).trim() || 'admin@colosseum.local';
    const password = await rl.question('Admin password: ');
    rl.close();

    // Try Strapi admin panel login first (gives full content manager access)
    const adminLogin = await fetch(`${BASE_URL.replace('/api', '')}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const adminBody = await adminLogin.json();

    if (adminLogin.ok && adminBody?.data?.token) {
      authHeader = `Bearer ${adminBody.data.token}`;
      useAdminApi = true;
      console.log('Authenticated as Strapi admin.');
    } else {
      // Fall back to regular user JWT
      const loginRes = await apiFetch('/auth/local', {
        method: 'POST',
        body: JSON.stringify({ identifier: email, password }),
      });
      authHeader = `Bearer ${loginRes.jwt}`;
      console.log('Authenticated as regular user (may have limited scopes).');
    }
  }

  const headers = { Authorization: authHeader };

  // Helper that picks the right base URL path depending on auth type
  const contentBase = useAdminApi
    ? `${BASE_URL.replace('/api', '')}/content-manager/collection-types`
    : BASE_URL;

  // For content-manager API: uid paths
  const PROBLEM_UID  = 'api::problem.problem';
  const TC_UID       = 'api::test-case.test-case';

  async function createEntry(uid, data) {
    if (useAdminApi) {
      const url = `${contentBase}/${uid}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(data),  // admin API: no `data` wrapper, fields direct
      });
      const json = await res.json();
      if (!res.ok) {
        console.error(`Admin API error ${res.status}:`, JSON.stringify(json?.error || json, null, 2));
        throw new Error(`HTTP ${res.status}`);
      }
      // admin content-manager returns the document directly
      return json;
    } else {
      return apiFetch(`/${uid.split('::')[1].split('.')[1]}s`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data }),
      });
    }
  }

  // 1. Find first ongoing (or next upcoming) event
  console.log('\nFetching events...');
  let events;
  if (useAdminApi) {
    const adminBase = BASE_URL.replace('/api', '');
    const res = await fetch(`${adminBase}/content-manager/collection-types/api::event.event?pageSize=50&sort=start:asc`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    const json = await res.json();
    events = json?.results || json?.data || [];
  } else {
    const eventsRes = await apiFetch('/events?pagination[pageSize]=50&sort=start:asc', { headers });
    events = eventsRes?.data || [];
  }

  if (!events.length) {
    console.error('No events found. Create an event first in the Strapi admin.');
    process.exit(1);
  }

  const now = Date.now();
  let event = events.find(e => {
    const start = e.start ? new Date(e.start).getTime() : 0;
    const end = e.end ? new Date(e.end).getTime() : Infinity;
    return start <= now && now <= end;
  }) ?? events.find(e => new Date(e.start).getTime() > now) ?? events[events.length - 1];

  console.log(`Using event: "${event.title || event.documentId}" (${event.documentId})`);

  // 2. Create the problem
  console.log('\nCreating problem...');
  const problemData = {
    title: 'Binary Search (Interactive)',
    description: DESCRIPTION,
    points: 100,
    isInteractive: true,
    interactorSource: INTERACTOR_SOURCE,
    event: event.documentId,
    publishedAt: new Date().toISOString(),
  };

  const problemResult = await createEntry(PROBLEM_UID, problemData);
  const problemDocId = problemResult?.documentId ?? problemResult?.data?.documentId;

  if (!problemDocId) {
    console.error('Problem creation failed:', JSON.stringify(problemResult, null, 2));
    process.exit(1);
  }
  console.log(`Problem created: ${problemDocId}`);

  // 3. Create test cases
  console.log('\nCreating test cases...');
  for (const [tcInput, desc, hidden] of TEST_CASES) {
    const tcResult = await createEntry(TC_UID, {
      input: tcInput,
      output: 'Accepted',
      hidden,
      locked: false,
      weight: 1,
      explanation: desc,
      problem: problemDocId,
      publishedAt: new Date().toISOString(),
    });
    const tcId = tcResult?.documentId ?? tcResult?.data?.documentId;
    console.log(`  [${hidden ? 'hidden' : 'visible'}] ${desc} → ${tcId}`);
  }

  console.log(`
Done!
Problem documentId : ${problemDocId}
Event              : ${event.title || event.documentId}

The problem is now visible in the event. Users should submit C++ code.

Interactor protocol recap:
  - Read N from stdin (first and only line)
  - Loop: print your guess, read HIGHER/LOWER/FOUND
  - Must find the secret in ≤ floor(log2(N))+1 queries
`);
}

main().catch(err => { console.error(err); process.exit(1); });
