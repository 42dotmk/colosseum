# lsp-proxy

WebSocket ⇄ clangd bridge that gives the competition editor (`web/src/pages/CompetePage`) C++
IntelliSense.

```
browser Monaco  ──ws://localhost:3030──▶  lsp-proxy/server.ts  ──stdio──▶  clangd
```

Monaco speaks raw JSON-RPC over the socket; `clangd` speaks `Content-Length`-framed JSON-RPC on
stdin/stdout. This proxy adds and strips that framing, and gives every connection its own throwaway
workspace (temp dir with `compile_flags.txt`, a `bits/stdc++.h` shim, and a force-included
`prefix.h` with `using namespace std;`).

## It is not in the compose files

`docker compose up` starts the database, `senatus` and the client — **not this**. `lsp-proxy` runs
on the host, in its own terminal, exactly like `executioner`. If nothing is listening on `3030`,
the editor shows a red **LSP error** badge within a second (see `web/src/lib/lsp/LspClient.ts`:
a refused socket fires `error`/`close`, which `RightPanel` renders as `LSP error`).

## Requirements

- Node 20+
- `clangd` on `PATH` (Windows: `winget install LLVM.LLVM` or `scoop install llvm`; Debian/Ubuntu:
  `sudo apt install clangd`; macOS: `brew install llvm`)
- Optional but recommended on Windows: a GCC on `PATH` (`MinGW`, `msys2`). clangd cannot see
  MinGW's C++ standard library headers on its own; the proxy probes `g++ -E -v` for the include
  search list and forwards it as `-isystem` flags. Without it, `<vector>` and friends do not
  resolve.

## Run

```bash
npm install
npm start        # tsx server.ts
npm run dev      # tsx watch server.ts
```

Port `3030` is hard-coded — there is no environment override, and `web/src/lib/lsp/useCppLsp.ts`
hard-codes the matching `ws://localhost:3030`. Start the proxy on the same machine as the browser.

## Verify

```bash
curl http://localhost:3030     # → clangd LSP proxy running
```

The startup log tells you what it resolved, which is the usual source of "completions are empty":

```
[lsp-proxy] Using clangd: C:\Program Files\LLVM\bin\clangd.exe
[lsp-proxy] Using C++ stdlib: x86_64-w64-mingw32 (7 include paths)
[lsp-proxy] Listening on http://localhost:3030
```

`Using C++ stdlib` is absent when no GCC was found — install one (above). For a functional check
without a browser, drive the socket directly: send `initialize`, `initialized`,
`textDocument/didOpen` (`file:///workspace/main.cpp`) and `textDocument/completion`; a healthy
proxy answers `initialize`, pushes `publishDiagnostics`, and returns member completions for a
trailing `v.` on a `vector<int>`.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Red **LSP error** badge | Nothing listening on `3030` — start the proxy. Badge does not retry; reload + toggle. |
| Proxy exits on startup with "clangd not found" | `clangd` not on `PATH` and not in the hard-coded Windows candidate list. |
| Completions empty, no stdlib headers | No GCC toolchain found → no `-isystem` flags. |
| Works after reload but dies later | Started as a child of another process (agent shell, IDE task) that exited; run it in a terminal of its own. |
