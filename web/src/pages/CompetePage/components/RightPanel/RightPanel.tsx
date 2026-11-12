import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Editor } from "@monaco-editor/react";
import { RotateCcw } from "lucide-react";
import { useCppLsp } from "@/lib/lsp/useCppLsp";
import type { LspClientState } from "@/lib/lsp/LspClient";
import { useTheme } from "@/contexts/ThemeContext";

import type Language from "../../types/Language";
import type * as Monaco from "monaco-editor";

import { useEffect, useRef, useState } from "react";

type RightPanelProps = {
  selectedLanguageObject: Language | undefined;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  defaultCode: string;
  handleSubmit: () => Promise<void>;
};

type LspStatus = 'off' | 'connecting' | 'ready' | 'error';

const LSP_STATUS_CLASSES: Record<LspStatus, string> = {
  off: 'bg-muted text-muted-foreground hover:bg-muted/80',
  connecting: 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25',
  ready: 'bg-green-500/15 text-green-400 hover:bg-green-500/25',
  error: 'bg-red-500/15 text-red-400 hover:bg-red-500/25',
};

const LSP_DOT_CLASSES: Record<LspStatus, string> = {
  off: 'bg-muted-foreground',
  connecting: 'bg-yellow-500 animate-pulse',
  ready: 'bg-green-500',
  error: 'bg-red-500',
};

const LSP_LABELS: Record<LspStatus, string> = {
  off: 'clangd off',
  connecting: 'connecting…',
  ready: 'clangd on',
  error: 'LSP error',
};

const getLspStatus = (enabled: boolean, state: LspClientState | 'disabled'): LspStatus => {
  if (!enabled) return 'off';
  if (state === 'ready') return 'ready';
  if (state === 'error' || state === 'closed') return 'error';
  return 'connecting';
};

export default function RightPanel({
  selectedLanguageObject,
  code,
  setCode,
  defaultCode,
  handleSubmit,
}: RightPanelProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  const isCpp = selectedLanguageObject?.codeName === 'cpp';
  const { theme } = useTheme();
  const [lspEnabled, setLspEnabled] = useState(false);
  const { lspState, attachLsp, detachLsp } = useCppLsp(isCpp && lspEnabled);
  const lspStatus = getLspStatus(lspEnabled, lspState);

  useEffect(() => {
    if (isCpp && lspEnabled && editorRef.current && monacoRef.current) {
      attachLsp(editorRef.current, monacoRef.current);
    } else {
      detachLsp();
    }
  }, [isCpp, lspEnabled, attachLsp, detachLsp]);

  const handleReset = () => {
    const editor = editorRef.current;
    const model = editor?.getModel();

    if (!editor || !model) {
      setCode(defaultCode);
      return;
    }

    editor.pushUndoStop();
    editor.executeEdits('reset-code', [
      {
        range: model.getFullModelRange(),
        text: defaultCode,
        forceMoveMarkers: true,
      },
    ]);
    editor.pushUndoStop();
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="border-b px-4 py-2 flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Editor</span>

        {isCpp && (
          <button
            onClick={() => setLspEnabled((v) => !v)}
            title={lspEnabled ? 'Disable clangd IntelliSense' : 'Enable clangd IntelliSense'}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors',
              LSP_STATUS_CLASSES[lspStatus]
            )}
          >
            <span className={cn('inline-block w-1.5 h-1.5 rounded-full', LSP_DOT_CLASSES[lspStatus])} />

            {LSP_LABELS[lspStatus]}
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          title="Reset to the default code"
          className="ml-auto flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={getEditorLanguage(selectedLanguageObject?.codeName)}
          value={code}
          onChange={(value) => setCode(value || '')}
          theme={theme === 'dark' ? 'vs-dark' : 'vs'}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            padding: { top: 12 },
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;

            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
              () => {
                handleSubmit();
              }
            );

            if (isCpp && lspEnabled) {
              attachLsp(editor, monaco);
            }
          }}
        />
      </div>
    </Card>
  );
}

function getEditorLanguage(codeName: string | undefined): string {
  if (!codeName) return 'javascript';

  const languageMap: Record<string, string> = {
    python: 'python',
    javascript: 'javascript',
    typescript: 'typescript',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'csharp',
    go: 'go',
    rust: 'rust',
  };

  return languageMap[codeName] || 'javascript';
}