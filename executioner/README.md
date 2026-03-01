# Executioner

Executioner is the queue worker that receives code execution jobs from RabbitMQ and runs them in language-specific Docker runtime images.

## Quick start (recommended)

1) Start RabbitMQ and PostgreSQL from repo root:

```bash
docker compose -f docker-compose.q.yml up -d
```

2) Install dependencies for the queue library and executioner:

```bash
cd lib/queue
npm install
npm run build

cd ../../executioner
npm install
```

3) Optional: pre-pull runtime images (faster first execution):

```bash
cd runtimes/languages
bash pull.sh
cd ../../
```

4) Start the worker:

```bash
npm start
```

Expected startup logs include:
- Connecting to RabbitMQ
- Connected to RabbitMQ

When a submission is received, you should see:
- Received msg
- docker run ... ghcr.io/42dotmk/colosseum-executioner-<language>

## Environment variables

Executioner defaults are usually enough for local development:

- RABBIT_URL (default: amqp://guest:guest@127.0.0.1:5672)
- PREFETCH_COUNT (default: 10)
- IMAGE_BASE (default: ghcr.io/42dotmk/colosseum-executioner-)
- WORKDIR (default: _work)
- CPU_LIMIT_PER_EXECUTION (optional)
- MEMORY_LIMIT_PER_EXECUTION (default: 1G)
- ENABLE_NETWORK_IN_EXECUTION (default: false)

Example (PowerShell):

```powershell
$env:RABBIT_URL="amqp://guest:guest@127.0.0.1:5672"
$env:PREFETCH_COUNT="10"
npm start
```

## Notes about Docker

- Executioner is not defined in docker-compose files in this repository; run it manually with npm start.
- The worker uses Docker CLI to launch language runtime containers.
- If runtime images are missing, Docker will pull them automatically on first use.

## Troubleshooting

### Submission shows processed but stdout is empty

Check execution records for stderr. Runtime launch failures are now surfaced there (for example: image pull failure, docker launch error, non-zero runtime exit).

### No worker activity

Verify:

```bash
docker ps
```

You should see rabbitmq running.

Then check worker terminal logs for RabbitMQ connection messages.

### Slow first run

First execution may be slow because Docker is pulling runtime images. Use pull.sh ahead of time.
