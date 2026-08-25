# Colosseum Local Setup

## Prerequisites

Install:

- Node.js 20+
- npm
- Docker
- Docker Compose
- Git

Create the root environment file:

```bash
cp .env.example .env
```

Create and configure:

```text
senatus/.env
```

For Senatus running directly on the host:

```env
DATABASE_HOST=localhost
DATABASE_PORT=15432
```

## First-Time Setup

From the repository root:

```bash
npm run setup
```

This will:

- install dependencies
- start PostgreSQL and RabbitMQ
- pull execution runtime images
- build the project

## Start Development

```bash
npm run dev
```

Main local services:

```text
Web:           http://localhost:1338
Senatus:       http://localhost:1337
Strapi Admin:  http://localhost:1337/admin
RabbitMQ UI:   http://localhost:15672
```

## Execution Runtime Images

Pull the available runtime images:

```bash
npm run runtimes:pull
```

Rebuild them when modifying runtime Dockerfiles:

```bash
npm run runtimes:build
```

## Infrastructure

Start:

```bash
npm run dev:infra
```

Check status:

```bash
npm run dev:infra:status
```

View logs:

```bash
npm run dev:infra:logs
```

Stop:

```bash
npm run dev:down
```

Reset local infrastructure and volumes:

```bash
npm run dev:infra:reset
```

## Development Checks

Before pushing:

```bash
npm run check
```

Individual checks:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
```
