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

### LSP Proxy (C++ IntelliSense)

> Not part of either compose file. `docker compose up` does **not** start it, so C++ IntelliSense
> shows a red **LSP error** badge in the editor until you run this.

The competition editor's clangd IntelliSense goes browser → `ws://localhost:3030` → `lsp-proxy`.
The proxy spawns `clangd` on demand and needs it on `PATH`:

- Windows: `winget install LLVM.LLVM` (or `scoop install llvm`)
- Debian/Ubuntu: `sudo apt install clangd`
- macOS: `brew install llvm`

Start it from its own terminal and leave it running:

```bash
cd lsp-proxy;
npm install;
npm start;        # or `npm run dev` to reload on change
```

It hard-codes port `3030` (no env override). Check it with `curl http://localhost:3030` →
`clangd LSP proxy running`. If the badge stays red after starting it, reload the problem page and
toggle IntelliSense off/on — the client does not retry a failed socket. See `lsp-proxy/README.md`.

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
