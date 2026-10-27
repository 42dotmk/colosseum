/**
 * useCppLsp — React hook that attaches a clangd LSP client to a Monaco editor
 * whenever the selected language is C++.
 *
 * Usage:
 *   const { lspState, attachLsp } = useCppLsp();
 *
 *   // In the Monaco onMount callback:
 *   onMount={(editor, monacoInstance) => attachLsp(editor, monacoInstance)}
 *
 *   // When language changes, re-attach:
 *   useEffect(() => { if (isCpp && editorRef.current) attachLsp(editorRef.current, monacoRef.current); }, [lang]);
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type * as MonacoType from 'monaco-editor';
import { LspClient, type LspClientState } from './LspClient';
import { registerCompletion, registerHover, registerSignatureHelp, registerDiagnostics } from './monacoProviders';

const LSP_WS_URL = 'ws://localhost:3030';
// Virtual file URI that clangd will treat as the C++ source file
const CPP_FILE_URI = 'file:///workspace/main.cpp';

export function useCppLsp(enabled: boolean) {
  const [lspState, setLspState] = useState<LspClientState | 'disabled'>('disabled');
  const clientRef = useRef<LspClient | null>(null);
  const disposablesRef = useRef<Array<{ dispose(): void }>>([]);
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoType | null>(null);
  const docVersionRef = useRef(1);
  // The model that was in the editor before LSP swapped it — restored on teardown
  const originalModelRef = useRef<MonacoType.editor.ITextModel | null>(null);
  // The LSP model we created — kept alive so the editor doesn't go blank
  const lspModelRef = useRef<MonacoType.editor.ITextModel | null>(null);

  // Cleanup helper (no state change — used by both teardown and failed connects)
  const cleanup = useCallback(() => {
    // Dispose providers / event listeners (NOT models)
    for (const d of disposablesRef.current) {
      try { d.dispose(); } catch { /* ignore */ }
    }
    disposablesRef.current = [];

    // Restore original model before we swapped to the LSP URI model
    const editor = editorRef.current;
    const monacoInstance = monacoRef.current;
    if (editor && monacoInstance && originalModelRef.current && !originalModelRef.current.isDisposed()) {
      // Copy current code back to the original model so the user doesn't lose their work
      const currentCode = editor.getValue();
      originalModelRef.current.setValue(currentCode);
      editor.setModel(originalModelRef.current);
    }
    originalModelRef.current = null;
    // Don't dispose lspModelRef — keep it cached for potential re-enable
    // (Monaco editor caches by URI, so re-creating is harmless either way)

    const client = clientRef.current;
    clientRef.current = null;
    if (client) {
      try { client.notify('exit'); } catch { /* ignore */ }
      client.dispose();
    }
  }, []);

  // Teardown helper — only called when the user turns LSP off
  const teardown = useCallback(() => {
    cleanup();
    setLspState('disabled');
  }, [cleanup]);

  // Connect and initialize clangd
  const connect = useCallback(
    async (
      editor: MonacoType.editor.IStandaloneCodeEditor,
      monacoInstance: typeof MonacoType,
    ) => {
      cleanup();

      editorRef.current = editor;
      monacoRef.current = monacoInstance;

      setLspState('connecting');
      const lsp = new LspClient(LSP_WS_URL);
      clientRef.current = lsp;
      lsp.onStateChange((nextState) => {
        if (clientRef.current === lsp) setLspState(nextState);
      });

      // Wait for WebSocket open (needed before we can send initialize)
      await new Promise<void>((resolve, reject) => {
        const ws = (lsp as unknown as { ws: WebSocket }).ws;
        if (ws.readyState === WebSocket.OPEN) return resolve();
        ws.addEventListener('open', () => resolve(), { once: true });
        ws.addEventListener('error', () => reject(new Error('WebSocket error')), { once: true });
        ws.addEventListener('close', () => reject(new Error('WebSocket closed before open')), { once: true });
      });

      // ---------- LSP Handshake ----------
      try {
        await lsp.request('initialize', {
          processId: null,
          rootUri: 'file:///workspace',
          capabilities: {
            textDocument: {
              synchronization: { dynamicRegistration: false, willSave: false, didSave: false },
              completion: {
                completionItem: { snippetSupport: true, documentationFormat: ['markdown', 'plaintext'] },
              },
              hover: { contentFormat: ['markdown', 'plaintext'] },
              signatureHelp: {},
              publishDiagnostics: { relatedInformation: true },
            },
          },
        });

        lsp.notify('initialized', {});
        lsp.markReady();

        // Send current file content
        const currentCode = editor.getValue();
        lsp.notify('textDocument/didOpen', {
          textDocument: {
            uri: CPP_FILE_URI,
            languageId: 'cpp',
            version: docVersionRef.current,
            text: currentCode,
          },
        });

        // Track changes and sync to clangd
        const changeDisposable = editor.onDidChangeModelContent(() => {
          docVersionRef.current++;
          lsp.notify('textDocument/didChange', {
            textDocument: { uri: CPP_FILE_URI, version: docVersionRef.current },
            contentChanges: [{ text: editor.getValue() }],
          });
        });
        disposablesRef.current.push(changeDisposable);

        // Remap the Monaco model's URI so providers target it
        const model = editor.getModel();
        if (model) {
          // Save the original model so we can restore it on teardown
          originalModelRef.current = model;

          // Create (or reuse) a model at the LSP URI
          const targetUri = monacoInstance.Uri.parse(CPP_FILE_URI);
          let lspModel = monacoInstance.editor.getModel(targetUri);
          if (!lspModel) {
            lspModel = monacoInstance.editor.createModel(
              model.getValue(),
              'cpp',
              targetUri,
            );
          } else {
            // Sync current code into the existing LSP model
            lspModel.setValue(model.getValue());
          }
          lspModelRef.current = lspModel;
          editor.setModel(lspModel);
          // NOTE: lspModel is intentionally NOT pushed to disposablesRef

          const activeModel = editor.getModel()!;

          // Register Monaco providers
          const completionD = registerCompletion(monacoInstance, lsp, CPP_FILE_URI);
          const hoverD = registerHover(monacoInstance, lsp, CPP_FILE_URI);
          const sigD = registerSignatureHelp(monacoInstance, lsp, CPP_FILE_URI);
          const clearDiag = registerDiagnostics(monacoInstance, lsp, CPP_FILE_URI, activeModel);

          disposablesRef.current.push(completionD, hoverD, sigD, { dispose: clearDiag });
        }
      } catch (err) {
        console.error('[useCppLsp] Failed to initialize clangd:', err);
        if (clientRef.current === lsp) {
          cleanup();
          setLspState('error');
        }
      }
    },
    [cleanup],
  );

  // Disable when `enabled` becomes false
  useEffect(() => {
    if (!enabled) teardown();
    return () => { /* teardown on unmount handled by caller */ };
  }, [enabled, teardown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { teardown(); };
  }, [teardown]);

  return {
    lspState,
    /** Call this inside Monaco's onMount when language is C++ */
    attachLsp: connect,
    detachLsp: teardown,
  };
}
