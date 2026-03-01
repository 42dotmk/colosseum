/**
 * Monaco Editor provider bridges for LSP.
 * Registers completion, hover, signatureHelp, diagnostics with Monaco using
 * an LspClient as the backing language server.
 */

import type * as monaco from 'monaco-editor';
import type { LspClient } from './LspClient';
import {
  type CompletionList, type CompletionItem, type Hover,
  type SignatureHelp, type PublishDiagnosticsParams,
  CompletionItemKind, InsertTextFormat, DiagnosticSeverity,
} from './lspTypes';

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function toMonacoPosition(pos: monaco.Position): { line: number; character: number } {
  return { line: pos.lineNumber - 1, character: pos.column - 1 };
}

function toMonacoRange(range: { start: { line: number; character: number }; end: { line: number; character: number } }): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

function lspKindToMonaco(kind?: number): monaco.languages.CompletionItemKind {
  const map: Record<number, monaco.languages.CompletionItemKind> = {
    [CompletionItemKind.Text]: 0,        // Text
    [CompletionItemKind.Method]: 0,      // Method
    [CompletionItemKind.Function]: 1,    // Function
    [CompletionItemKind.Constructor]: 2, // Constructor
    [CompletionItemKind.Field]: 3,       // Field
    [CompletionItemKind.Variable]: 4,    // Variable
    [CompletionItemKind.Class]: 5,       // Class
    [CompletionItemKind.Interface]: 7,   // Interface
    [CompletionItemKind.Module]: 8,      // Module
    [CompletionItemKind.Property]: 9,    // Property
    [CompletionItemKind.Keyword]: 17,    // Keyword
    [CompletionItemKind.Snippet]: 27,    // Snippet
    [CompletionItemKind.Enum]: 15,       // Enum
    [CompletionItemKind.EnumMember]: 16, // EnumMember
    [CompletionItemKind.Constant]: 14,   // Constant
    [CompletionItemKind.Struct]: 6,      // Struct
    [CompletionItemKind.TypeParameter]: 24, // TypeParameter
  };
  return (kind !== undefined && map[kind] !== undefined) ? map[kind] : 0;
}

// --------------------------------------------------------------------------
// Completion provider
// --------------------------------------------------------------------------

export function registerCompletion(
  monacoRef: typeof monaco,
  lsp: LspClient,
  fileUri: string,
): monaco.IDisposable {
  return monacoRef.languages.registerCompletionItemProvider('cpp', {
    triggerCharacters: ['.', '>', ':', '#', '<', '"'],
    async provideCompletionItems(model, position) {
      if (model.uri.toString() !== fileUri) return null;
      try {
        const result = await lsp.request<CompletionList | CompletionItem[] | null>(
          'textDocument/completion',
          {
            textDocument: { uri: fileUri },
            position: toMonacoPosition(position),
            context: { triggerKind: 1 }, // Invoked
          },
        );
        if (!result) return { suggestions: [] };

        const items: CompletionItem[] = Array.isArray(result) ? result : result.items;
        const wordInfo = model.getWordUntilPosition(position);
        const replaceRange: monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: position.column,
        };

        const suggestions: monaco.languages.CompletionItem[] = items.map((item) => {
          let insertText = item.insertText ?? item.label;
          let insertTextRules: monaco.languages.CompletionItemInsertTextRule | undefined;

          if (item.insertTextFormat === InsertTextFormat.Snippet) {
            insertTextRules = monacoRef.languages.CompletionItemInsertTextRule.InsertAsSnippet;
          }

          // Resolve range from textEdit if available
          let range: monaco.IRange = replaceRange;
          if (item.textEdit) {
            const edit = item.textEdit;
            if ('range' in edit) range = toMonacoRange(edit.range);
            else if ('replace' in edit) range = toMonacoRange(edit.replace);
            if ('newText' in edit) insertText = edit.newText;
          }

          const docContent = item.documentation;
          const docStr = typeof docContent === 'string'
            ? docContent
            : docContent?.value ?? '';

          return {
            label: item.label,
            kind: lspKindToMonaco(item.kind),
            detail: item.detail,
            documentation: docStr ? { value: docStr } : undefined,
            insertText,
            insertTextRules,
            range,
            filterText: item.filterText,
            sortText: item.sortText,
          } as monaco.languages.CompletionItem;
        });

        return {
          suggestions,
          incomplete: !Array.isArray(result) && result.isIncomplete,
        };
      } catch {
        return { suggestions: [] };
      }
    },

    async resolveCompletionItem(item) {
      // Optionally resolve details — skip for now
      return item;
    },
  });
}

// --------------------------------------------------------------------------
// Hover provider
// --------------------------------------------------------------------------

export function registerHover(
  monacoRef: typeof monaco,
  lsp: LspClient,
  fileUri: string,
): monaco.IDisposable {
  return monacoRef.languages.registerHoverProvider('cpp', {
    async provideHover(model, position) {
      if (model.uri.toString() !== fileUri) return null;
      try {
        const result = await lsp.request<Hover | null>(
          'textDocument/hover',
          {
            textDocument: { uri: fileUri },
            position: toMonacoPosition(position),
          },
        );
        if (!result) return null;

        let contents: monaco.IMarkdownString[] = [];
        if (Array.isArray(result.contents)) {
          contents = (result.contents as Array<string | { language: string; value: string }>).map((c) => {
            if (typeof c === 'string') return { value: c };
            return { value: `\`\`\`${c.language}\n${c.value}\n\`\`\`` };
          });
        } else if (typeof result.contents === 'string') {
          contents = [{ value: result.contents }];
        } else if (result.contents && typeof result.contents === 'object') {
          const mc = result.contents as { kind: string; value: string };
          contents = [{ value: mc.value, isTrusted: mc.kind === 'markdown' }];
        }

        return {
          contents,
          range: result.range ? toMonacoRange(result.range) : undefined,
        };
      } catch {
        return null;
      }
    },
  });
}

// --------------------------------------------------------------------------
// Signature Help provider
// --------------------------------------------------------------------------

export function registerSignatureHelp(
  monacoRef: typeof monaco,
  lsp: LspClient,
  fileUri: string,
): monaco.IDisposable {
  return monacoRef.languages.registerSignatureHelpProvider('cpp', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],
    async provideSignatureHelp(model, position) {
      if (model.uri.toString() !== fileUri) return null;
      try {
        const result = await lsp.request<SignatureHelp | null>(
          'textDocument/signatureHelp',
          {
            textDocument: { uri: fileUri },
            position: toMonacoPosition(position),
            context: { triggerKind: 1, isRetrigger: false },
          },
        );
        if (!result || !result.signatures.length) return null;

        const signatures: monaco.languages.SignatureInformation[] = result.signatures.map((sig) => {
          const parameters: monaco.languages.ParameterInformation[] = (sig.parameters ?? []).map((p) => ({
            label: typeof p.label === 'string' ? p.label : p.label,
            documentation: typeof p.documentation === 'string'
              ? { value: p.documentation }
              : p.documentation ? { value: p.documentation.value } : undefined,
          }));
          const docStr = typeof sig.documentation === 'string'
            ? sig.documentation
            : sig.documentation?.value ?? '';
          return {
            label: sig.label,
            documentation: docStr ? { value: docStr } : undefined,
            parameters,
          };
        });

        return {
          value: {
            signatures,
            activeSignature: result.activeSignature ?? 0,
            activeParameter: result.activeParameter ?? 0,
          },
          dispose: () => {},
        };
      } catch {
        return null;
      }
    },
  });
}

// --------------------------------------------------------------------------
// Diagnostics (publishDiagnostics notification)
// --------------------------------------------------------------------------

export function registerDiagnostics(
  monacoRef: typeof monaco,
  lsp: LspClient,
  fileUri: string,
  model: monaco.editor.ITextModel,
): () => void {
  const lspSeverityToMonaco = (sev?: number): monaco.MarkerSeverity => {
    if (sev === DiagnosticSeverity.Error) return monacoRef.MarkerSeverity.Error;
    if (sev === DiagnosticSeverity.Warning) return monacoRef.MarkerSeverity.Warning;
    if (sev === DiagnosticSeverity.Information) return monacoRef.MarkerSeverity.Info;
    if (sev === DiagnosticSeverity.Hint) return monacoRef.MarkerSeverity.Hint;
    return monacoRef.MarkerSeverity.Error;
  };

  const handler = (params: unknown) => {
    const { uri, diagnostics } = params as PublishDiagnosticsParams;
    if (uri !== fileUri) return;
    const markers: monaco.editor.IMarkerData[] = diagnostics
      .filter((d) => {
        // Suppress noise originating from bits/stdc++.h
        const msg = d.message.toLowerCase();
        return !msg.includes("bits/stdc++") && !msg.includes("'bits/");
      })
      .map((d) => ({
        severity: lspSeverityToMonaco(d.severity),
        message: d.message,
        source: d.source,
        code: String(d.code ?? ''),
        startLineNumber: d.range.start.line + 1,
        startColumn: d.range.start.character + 1,
        endLineNumber: d.range.end.line + 1,
        endColumn: d.range.end.character + 1,
      }));
    monacoRef.editor.setModelMarkers(model, 'clangd', markers);
  };

  lsp.onNotification('textDocument/publishDiagnostics', handler);

  return () => {
    monacoRef.editor.setModelMarkers(model, 'clangd', []);
  };
}
