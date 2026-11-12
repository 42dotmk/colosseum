## Quickstart (everything for local testing)

Requires Docker, Node 20+ and, for C++ autocomplete, clangd (`winget install LLVM.LLVM`).

```bash
npm run dev
```

This creates `.env` and `senatus/.env` with local defaults, starts RabbitMQ and Postgres, builds the C++ runtime image,
then runs Senatus (Strapi), the Executioner, the LSP proxy and the web app. The first start also seeds the data
(a few minutes, first time only).

| What | Where |
|---|---|
| Frontend | http://localhost:1338 |
| Strapi admin | http://localhost:1337/admin, `admin@colosseum.local` / `Admin12345!` |
| Participants | `student@colosseum.local` / `Student123!`, `alice@colosseum.local` / `Alice123!`, `bob@colosseum.local` / `Bob12345!` (registered for every event) |
| Unregistered user | `mallory@colosseum.local` / `Mallory123!` (for testing the registration guard) |

### Seed data

Enabled by `SEED_DEV_DATA=true` in `senatus/.env` (idempotent, runs on every Senatus bootstrap). It creates the admin, the users
above, the C++ language and the C++ course homework (100 problems, English) as one event per lecture. The first event starts on
`SEED_FIRST_EVENT_START` (default `2027-01-12T21:00:00+01:00`, that is Jan 12 21:00 CET), each next one 14 days later, each lasting 14 days.

Per problem: test 1 is the visible sample (weight 1), test 2 is hidden (weight 2), test 3 is hidden and locked (weight 3).
The data lives in `senatus/seed/cpp-course.json` and is generated from the course folder with
`npm run seed:build -- "<path to CPP Course>"`.

To test submitting, start the first event in the past, for example
`SEED_FIRST_EVENT_START=2026-10-01T00:00:00Z npm run dev` on a fresh database
(`docker compose -f docker-compose.q.yml down -v` resets it).

The course homework is 100 problems plus one interactive problem ("Guess the number") in the Lecture 5 event.

### Execution limits

Senatus sends the language's time (`defaultMaxCpuTime`, seconds, fractions allowed) and memory (`defaultMaxMemory`, MB) limit
with every job (`DEFAULT_EXECUTION_TIME` / `DEFAULT_EXECUTION_MEMORY` on Senatus fill in when a language has none).

You can run several executioners on the same queue with different capabilities. An executioner only runs a job whose limits it
can fully give; otherwise it passes the job on to another one (so a weak server never silently shortens a limit), and a job that
no server can satisfy fails with "No execution server can satisfy the limits of this problem". Set the capabilities on each
executioner process:

| Variable | Default | Meaning |
|---|---|---|
| `EXECUTOR_NAME` | host name | Name used in logs |
| `MAX_EXECUTION_TIME` | `10` | Highest time limit (seconds) this server accepts |
| `MEMORY_LIMIT_PER_EXECUTION` | `1G` | Highest memory limit this server accepts (`512m`, `2G`, ...) |
| `TIME_LIMIT_SCALE` | `1` | CPU time multiplier for a CPU that is genuinely slower per instruction (`2` = half as fast, for example an emulated architecture). The participant still sees the unscaled limit |
| `CPU_LIMIT_PER_EXECUTION` | `1` | `docker --cpus` per execution (`0` removes the quota) |
| `PREFETCH_COUNT` | half the CPU cores | Jobs run at the same time. Each job compiles in its container, so do not oversubscribe the cores |
| `WALL_FACTOR`, `WALL_SLACK_SECONDS` | `4`, `5` | Safety net only: a program that waits without using the CPU is stopped after `limit * 4 + 5` seconds of wall-clock time |
| `COMPILE_TIMEOUT_SECONDS` | `60` | A compile that does not finish is reported as a failure |
| `COMPILE_HEADROOM_MB` | `1024` | Extra container memory for compiling; the program itself is held to the memory limit |
| `PIDS_LIMIT_PER_EXECUTION` | `256` | Process limit per execution |
| `OUTPUT_LIMIT_MB` | `4` | Output a program may write before it is stopped |
| `MAX_JOB_WAIT_SECONDS` | `120` | How long a job may be passed on between servers that cannot satisfy it before it fails (a capable server may just be busy) |
| `EXECUTION_PLATFORM`, `IMAGE_BASE` | unset | Run a runtime image for another architecture, for example `linux/arm64` |

How limits are judged:

- **Time is CPU time** (user + system time of the program, all threads), measured by a small supervisor (`runner.c`) baked into the
  runtime image. Queueing, CPU quotas, how many jobs run at once and waiting (sleep, blocked reads) do not change it, so the same
  program gets the same verdict on an idle and on a busy server. Time spent compiling is not counted.
- **What software cannot remove** is the speed of the hardware itself: shared caches, frequency scaling and hybrid (fast and slow)
  cores change how long the same instructions take. On a hybrid laptop CPU the same program measured from 0.46 s to 1.05 s depending
  on load and core type, and a software calibration (a benchmark run before the program) did not track it reliably. For fair
  contests use judging hosts with homogeneous cores at a fixed frequency (no turbo or power saving) that run nothing else heavy,
  keep `PREFETCH_COUNT` at most the number of cores, and set limits with a margin (2x or more) over the reference solution.
  Instruction counters (perf) would be deterministic, but virtual machines usually do not expose them.
- **Repeatability** (`e2e/tests/executioner/repeatability.spec.ts`, 100 runs of the same code per case, measured on a hybrid
  laptop CPU): the verdict and the output were identical in every run. Peak memory (reported next to the time) varied by at most
  0.17 MB. CPU time varied by about 5% (coefficient of variation) for a 0.4 s program in separate containers, 7% inside one
  container, and 26% while 4 jobs ran at the same time, where a few runs took 2x the median. Expect a quiet homogeneous server to
  be tighter than these numbers.
- **Different machines**: a CPU that is slower per instruction declares `TIME_LIMIT_SCALE`, and jobs a server cannot fully serve are
  left to other servers.
- **Memory** is an address-space limit (`RLIMIT_AS`, like many judges), so reserved memory counts. It is the same on every
  machine. On an emulated architecture (QEMU) it is not enforced; a native arm64 server enforces it.
- The participant program runs as an unprivileged user and cannot read test inputs, sources or judge binaries.

### End-to-end tests (Playwright)

With the stack running and seeded (see above, with the first event in the past):

```bash
cd e2e
npm install
npx playwright install chromium
npx playwright test                 # everything
npx playwright test --project=api   # seed, security, grading, practice, snapshots, interactive
npx playwright test --project=limits  # time/memory limits, abuse, two executioners, slower hardware, arm64
npx playwright test --project=ui    # browser flows
```

The fleet tests start a second, weaker executioner next to the stack's own. The arm64 tests are skipped unless the image exists:
`docker build --platform linux/arm64 -t ghcr.io/42dotmk/colosseum-executioner-arm64-gcc:latest executioner/runtimes/languages/gcc`.

The tests create their own events and problems through a temporary admin API token and remove them afterwards. Strapi
rate-limits logins (5 per minute), so wait a minute between runs.

GraphQL is disabled by default (it bypasses the REST sanitizers for hidden test cases); set `ENABLE_GRAPHQL=true` to opt in.

## Prerequisites

Create a `.env` file in the root of the repository by following the example file: `.env.example` 

### RabbitMQ

> Required to run the Executioner/code execution engine.

To run the RabbitMQ and PostgreSQL in Docker for development, just run:

```bash
docker compose -f docker-compose.q.yml up -d
```

### Queue Library

Build the queue library before continuing.

```bash
cd lib/queue;
npm install;
npm run build;
```

### Client / Frontend

To start the frontend

```bash
cd web;
npm install;
npm run dev;
```

### Executioner

> Note: Node version should be v20

There's no additional setup required, it will automatically connect to `amqp://localhost` (RabbitMQ on port `5672`).

```bash
cd executioner;
npm install;
npm start;
```

### Execution Environments

The execution environments are defined in `./executioner/runtimes/languages` there are 2 scripts:

- `build.sh` Will build all available languages (all directories contain a language defined by the directory name (ex: `csharp` is C#))
- `pull.sh` Will pull all of the readily available images so that there's no pulling when a code execution is requested.

Usually you just need to run `pull.sh` to get the images available locally.

### Senatus

You initially would need to setup the `.env` file by following the example file: `.env.example` 

```bash
cd senatus;
npm install;
npm run develop;
```
