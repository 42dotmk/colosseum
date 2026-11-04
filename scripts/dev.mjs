#!/usr/bin/env node
/**
 * Colosseum quickstart: `npm run dev` from the repo root.
 *
 * Starts RabbitMQ + Postgres (docker), then senatus (Strapi), executioner,
 * lsp-proxy (clangd) and the web frontend, with prefixed logs. Ctrl+C stops all.
 *
 * Env overrides: SEED_FIRST_EVENT_START, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD.
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@colosseum.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';

const say = (m) => console.log(`\x1b[1m[quickstart]\x1b[0m ${m}`);
const die = (m) => { console.error(`\x1b[31m[quickstart] ${m}\x1b[0m`); process.exit(1); };
const run = (cmd, args, cwd = root, opts = {}) =>
  spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin && cmd.endsWith('.cmd'), ...opts });

// ---------------------------------------------------------------- prerequisites
if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) die('Docker is not running.');
if (Number(process.versions.node.split('.')[0]) < 20) die('Node 20+ is required.');

// ---------------------------------------------------------------- env files
const rootEnv = path.join(root, '.env');
if (!fs.existsSync(rootEnv)) {
  fs.writeFileSync(rootEnv, [
    'DATABASE_HOST=localhost', 'DATABASE_CLIENT=postgres', 'DATABASE_PORT=15432',
    'DATABASE_NAME=cms', 'DATABASE_USERNAME=cms', 'DATABASE_PASSWORD=pass', '',
  ].join('\n'));
  say('created .env');
}

const senatusEnv = path.join(root, 'senatus', '.env');
if (!fs.existsSync(senatusEnv)) {
  const secret = () => crypto.randomBytes(16).toString('base64');
  fs.writeFileSync(senatusEnv, [
    'RABBIT_URL=amqp://guest:guest@127.0.0.1:5672', 'HOST=0.0.0.0', 'PORT=1337',
    `APP_KEYS="${secret()},${secret()}"`, `API_TOKEN_SALT=${secret()}`, `ADMIN_JWT_SECRET=${secret()}`,
    `TRANSFER_TOKEN_SALT=${secret()}`, `JWT_SECRET=${secret()}`,
    'DATABASE_HOST=localhost', 'DATABASE_PORT=15432', 'DATABASE_NAME=cms',
    'DATABASE_USERNAME=cms', 'DATABASE_PASSWORD=pass', 'SEED_DEV_DATA=true', '',
  ].join('\n'));
  say('created senatus/.env (SEED_DEV_DATA=true)');
}

// ---------------------------------------------------------------- infra
say('starting RabbitMQ + Postgres');
if (run('docker', ['compose', '-f', 'docker-compose.q.yml', 'up', '-d']).status !== 0) die('docker compose failed');

const waitPort = (port, name, timeoutMs = 60000) => new Promise((resolve) => {
  const started = Date.now();
  const attempt = () => {
    const s = net.connect(port, '127.0.0.1');
    s.on('connect', () => { s.destroy(); resolve(true); });
    s.on('error', () => {
      s.destroy();
      if (Date.now() - started > timeoutMs) { say(`timed out waiting for ${name}`); resolve(false); }
      else setTimeout(attempt, 1000);
    });
  };
  attempt();
});
await waitPort(5672, 'RabbitMQ');
await waitPort(15432, 'Postgres');

// ---------------------------------------------------------------- deps + builds
if (!fs.existsSync(path.join(root, 'lib/queue/node_modules'))) run(npm, ['install'], path.join(root, 'lib/queue'));
if (!fs.existsSync(path.join(root, 'lib/queue/dist'))) run(npm, ['run', 'build'], path.join(root, 'lib/queue'));
for (const d of ['senatus', 'executioner', 'lsp-proxy', 'web']) {
  if (!fs.existsSync(path.join(root, d, 'node_modules'))) { say(`npm install in ${d}`); run(npm, ['install'], path.join(root, d)); }
}

// ---------------------------------------------------------------- executioner image
const image = 'ghcr.io/42dotmk/colosseum-executioner-gcc:latest';
if (spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' }).status !== 0) {
  say('building C++ runtime image (first run only)');
  run('docker', ['build', '-t', image, '.'], path.join(root, 'executioner/runtimes/languages/gcc'));
}

// ---------------------------------------------------------------- clangd check
const clangd = spawnSync('clangd', ['--version'], { stdio: 'ignore', shell: isWin });
const llvmWin = isWin && fs.existsSync('C:\\Program Files\\LLVM\\bin\\clangd.exe');
const lspAvailable = clangd.status === 0 || llvmWin;
if (!lspAvailable) say('WARNING: clangd not found, lsp-proxy will not start (winget install LLVM.LLVM)');

// ---------------------------------------------------------------- processes
const children = [];
const colors = { senatus: 36, executioner: 33, lsp: 35, web: 32 };
const start = (name, cmd, args, cwd, env = {}) => {
  const child = spawn(cmd, args, {
    cwd: path.join(root, cwd), shell: isWin, env: { ...process.env, ...env }, detached: !isWin,
  });
  const prefix = `\x1b[${colors[name]}m[${name}]\x1b[0m `;
  const pipe = (stream) => stream.on('data', (d) =>
    d.toString().split(/\r?\n/).filter(Boolean).forEach((l) => console.log(prefix + l)));
  pipe(child.stdout); pipe(child.stderr);
  child.on('exit', (code) => say(`${name} exited (${code})`));
  children.push(child);
};

start('senatus', npm, ['run', 'develop'], 'senatus', { SEED_DEV_DATA: process.env.SEED_DEV_DATA ?? 'true' });
start('executioner', npm, ['start'], 'executioner');
if (lspAvailable) start('lsp', npm, ['start'], 'lsp-proxy');
start('web', npm, ['run', 'dev'], 'web');

const stopAll = () => {
  for (const c of children) {
    try {
      if (isWin) spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
      else process.kill(-c.pid);
    } catch { /* already gone */ }
  }
  process.exit(0);
};
process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);

say('waiting for senatus (the first start seeds ~100 problems and takes several minutes)...');
await waitPort(1337, 'senatus', 1800000);
say('');
say('Ready:');
say('  Frontend      http://localhost:1338');
say('  Strapi admin  http://localhost:1337/admin   ' + `${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
say('  Participants  student@colosseum.local / Student123!   (also alice, bob; mallory is unregistered)');
say('  RabbitMQ UI   http://localhost:15672 (guest/guest)');
say('Ctrl+C stops everything.');
