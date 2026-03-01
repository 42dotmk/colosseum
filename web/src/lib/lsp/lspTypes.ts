// Minimal LSP type definitions needed for completion, hover, diagnostics, signatureHelp

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface TextDocumentIdentifier {
  uri: string;
}

export interface VersionedTextDocumentIdentifier extends TextDocumentIdentifier {
  version: number;
}

export interface TextDocumentPositionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

// Completion
export const CompletionItemKind = {
  Text: 1, Method: 2, Function: 3, Constructor: 4, Field: 5,
  Variable: 6, Class: 7, Interface: 8, Module: 9, Property: 10,
  Unit: 11, Value: 12, Enum: 13, Keyword: 14, Snippet: 15,
  Color: 16, File: 17, Reference: 18, Folder: 19, EnumMember: 20,
  Constant: 21, Struct: 22, Event: 23, Operator: 24, TypeParameter: 25,
} as const;

export const InsertTextFormat = { PlainText: 1, Snippet: 2 } as const;

export interface CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
  insertTextFormat?: number;
  filterText?: string;
  sortText?: string;
  textEdit?: { range: Range; newText: string } | { insert: Range; replace: Range; newText: string };
  additionalTextEdits?: Array<{ range: Range; newText: string }>;
  command?: { command: string; title: string; arguments?: any[] };
  data?: any;
}

export interface CompletionList {
  isIncomplete: boolean;
  items: CompletionItem[];
}

// Hover
export interface Hover {
  contents: { kind: string; value: string } | string | Array<{ language: string; value: string } | string>;
  range?: Range;
}

// Diagnostics
export const DiagnosticSeverity = { Error: 1, Warning: 2, Information: 3, Hint: 4 } as const;

export interface Diagnostic {
  range: Range;
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
}

export interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: Diagnostic[];
}

// Signature Help
export interface ParameterInformation {
  label: string | [number, number];
  documentation?: string | { kind: string; value: string };
}

export interface SignatureInformation {
  label: string;
  documentation?: string | { kind: string; value: string };
  parameters?: ParameterInformation[];
}

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

// Initialize
export interface InitializeParams {
  processId: number | null;
  rootUri: string;
  capabilities: ClientCapabilities;
  initializationOptions?: any;
}

export interface ClientCapabilities {
  textDocument?: {
    synchronization?: { dynamicRegistration?: boolean; willSave?: boolean; didSave?: boolean };
    completion?: {
      dynamicRegistration?: boolean;
      completionItem?: { snippetSupport?: boolean; documentationFormat?: string[] };
    };
    hover?: { dynamicRegistration?: boolean; contentFormat?: string[] };
    signatureHelp?: { dynamicRegistration?: boolean };
    publishDiagnostics?: { relatedInformation?: boolean };
  };
  workspace?: {
    didChangeConfiguration?: { dynamicRegistration?: boolean };
  };
}
