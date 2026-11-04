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
`SEED_FIRST_EVENT_START` (default `2026-12-01`), each next one 14 days later, each lasting 14 days.

Per problem: test 1 is the visible sample (weight 1), test 2 is hidden (weight 2), test 3 is hidden and locked (weight 3).
The data lives in `senatus/seed/cpp-course.json` and is generated from the course folder with
`npm run seed:build -- "<path to CPP Course>"`.

To test submitting, start the first event in the past, for example
`SEED_FIRST_EVENT_START=2026-10-01T00:00:00Z npm run dev` on a fresh database
(`docker compose -f docker-compose.q.yml down -v` resets it).

`node scripts/verify-seed.mjs` runs security and grading checks against the running stack
(`SOLUTION_FILE=<cpp file>` also submits and grades a solution).

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
