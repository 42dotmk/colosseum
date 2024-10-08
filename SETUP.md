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
cd client;
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
