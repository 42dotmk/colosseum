/**
 * LSP Proxy Server
 * Bridges Monaco Editor (via WebSocket) <-> clangd (via stdin/stdout)
 *
 * Protocol detail:
 *   - LSP uses Content-Length framing over stdio
 *   - Over WebSocket we send/receive raw JSON (no framing)
 *   - This proxy adds/strips the Content-Length headers
 *
 * Requires clangd to be installed and on PATH.
 * Install: sudo apt install clangd  |  brew install llvm
 */

import { WebSocketServer, WebSocket } from 'ws';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

// Common Windows paths where clangd might be installed
const CLANGD_CANDIDATES = [
  'clangd',
  'C:\\Program Files\\LLVM\\bin\\clangd.exe',
  'C:\\Program Files (x86)\\LLVM\\bin\\clangd.exe',
  path.join(os.homedir(), 'scoop', 'apps', 'llvm', 'current', 'bin', 'clangd.exe'),
];

function findClangd(): string {
  for (const candidate of CLANGD_CANDIDATES) {
    try {
      execSync(`"${candidate}" --version`, { stdio: 'ignore' });
      return candidate;
    } catch { /* try next */ }
  }
  throw new Error(
    'clangd not found. Install LLVM:\n' +
    '  winget install LLVM.LLVM\n' +
    '  -- or --\n' +
    '  scoop install llvm\n' +
    '  -- or download from: https://github.com/llvm/llvm-project/releases',
  );
}

let clangdExe: string;
try {
  clangdExe = findClangd();
  console.log(`[lsp-proxy] Using clangd: ${clangdExe}`);
} catch (err) {
  console.error('[lsp-proxy]', (err as Error).message);
  process.exit(1);
}

const PORT = 3030;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('clangd LSP proxy running\n');
});

const wss = new WebSocketServer({ server });

// Keep the proxy alive — log unhandled errors instead of crashing
process.on('uncaughtException', (err) => {
  console.error('[lsp-proxy] Uncaught exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[lsp-proxy] Unhandled rejection:', reason);
});

console.log(`[lsp-proxy] Starting WebSocket server on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`[lsp-proxy] Client connected from ${clientIp}`);

  // Create a temp workspace directory with compile_flags.txt and bits/stdc++.h shim
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clangd-'));

  // compile_flags.txt — add -I. so the local bits/stdc++.h shim is found
  fs.writeFileSync(
    path.join(workDir, 'compile_flags.txt'),
    [
      '-std=c++17',
      '-Wall',
      '-I.',
      '-I/usr/include',
      '-I/usr/local/include',
    ].join('\n'),
  );

  // Provide a bits/stdc++.h shim — GCC-only header used heavily in competitive programming
  const bitsDir = path.join(workDir, 'bits');
  fs.mkdirSync(bitsDir);
  fs.writeFileSync(
    path.join(bitsDir, 'stdc++.h'),
    [
      '// bits/stdc++.h shim for clangd (competitive programming convenience header)',
      '#pragma once',
      '#include <algorithm>',
      '#include <array>',
      '#include <bitset>',
      '#include <cassert>',
      '#include <cctype>',
      '#include <climits>',
      '#include <cmath>',
      '#include <complex>',
      '#include <cstdio>',
      '#include <cstdlib>',
      '#include <cstring>',
      '#include <ctime>',
      '#include <deque>',
      '#include <fstream>',
      '#include <functional>',
      '#include <iomanip>',
      '#include <iostream>',
      '#include <iterator>',
      '#include <limits>',
      '#include <list>',
      '#include <map>',
      '#include <memory>',
      '#include <numeric>',
      '#include <optional>',
      '#include <queue>',
      '#include <random>',
      '#include <regex>',
      '#include <set>',
      '#include <sstream>',
      '#include <stack>',
      '#include <stdexcept>',
      '#include <string>',
      '#include <string_view>',
      '#include <tuple>',
      '#include <type_traits>',
      '#include <unordered_map>',
      '#include <unordered_set>',
      '#include <utility>',
      '#include <variant>',
      '#include <vector>',
    ].join('\n'),
  );
  console.log(`[lsp-proxy] Created workspace: ${workDir}`);

  // Spawn clangd
  let clangd: ChildProcessWithoutNullStreams;
  try {
    clangd = spawn(clangdExe, [
      '--background-index',
      '--clang-tidy=false',
      '--completion-style=detailed',
      '--function-arg-placeholders=true',
      `--compile-commands-dir=${workDir}`,
      '--log=error',
    ], {
      cwd: workDir,
    });
  } catch (err) {
    console.error('[lsp-proxy] Failed to spawn clangd:', err);
    ws.close(1011, 'clangd not found');
    return;
  }

  console.log(`[lsp-proxy] Spawned clangd PID ${clangd.pid}`);

  // ------------------------------------------------------------------
  // clangd stdout -> WebSocket  (strip Content-Length framing)
  // ------------------------------------------------------------------
  let stdoutBuf = '';

  clangd.stdout.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString('utf8');

    while (true) {
      // Look for the header separator
      const headerEnd = stdoutBuf.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const headers = stdoutBuf.slice(0, headerEnd);
      const match = headers.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        // Malformed — drop everything up to and including the separator
        stdoutBuf = stdoutBuf.slice(headerEnd + 4);
        break;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;

      if (stdoutBuf.length < bodyStart + contentLength) break; // wait for more data

      const body = stdoutBuf.slice(bodyStart, bodyStart + contentLength);
      stdoutBuf = stdoutBuf.slice(bodyStart + contentLength);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(body);
      }
    }
  });

  clangd.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf8');
    // Suppress cosmetic IncludeCleaner noise for GCC-only headers
    if (!text.includes('IncludeCleaner')) {
      process.stderr.write(`[clangd] ${text}`);
    }
  });

  // ------------------------------------------------------------------
  // WebSocket -> clangd stdin  (add Content-Length framing)
  // ------------------------------------------------------------------
  ws.on('message', (raw: Buffer | string) => {
    const body = raw.toString('utf8');
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
    clangd.stdin.write(header + body);
  });

  // ------------------------------------------------------------------
  // Cleanup helpers
  // ------------------------------------------------------------------
  let cleaned = false;

  function cleanupWorkDir(attempt = 0) {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (err: any) {
      if ((err.code === 'EPERM' || err.code === 'EBUSY') && attempt < 5) {
        // clangd holds file locks briefly after exit on Windows — retry
        setTimeout(() => cleanupWorkDir(attempt + 1), 300 * (attempt + 1));
      } else {
        console.warn(`[lsp-proxy] Could not clean up ${workDir}: ${err.message}`);
      }
    }
  }

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    console.log(`[lsp-proxy] Client disconnected, killing clangd PID ${clangd.pid}`);
    try { clangd.kill(); } catch { /* already dead */ }
    // Defer deletion so clangd can release file handles
    setTimeout(() => cleanupWorkDir(), 500);
  }

  ws.on('close', cleanup);

  ws.on('error', (err) => {
    console.error('[lsp-proxy] WebSocket error:', err.message);
  });

  clangd.on('exit', (code, signal) => {
    console.log(`[lsp-proxy] clangd exited (code=${code}, signal=${signal})`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    } else {
      // ws.close() will trigger cleanup; if already closed, clean up directly
      if (cleaned) return;
      setTimeout(() => cleanupWorkDir(), 500);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[lsp-proxy] Listening on http://localhost:${PORT}`);
  console.log(`[lsp-proxy] WebSocket endpoint: ws://localhost:${PORT}`);
});
