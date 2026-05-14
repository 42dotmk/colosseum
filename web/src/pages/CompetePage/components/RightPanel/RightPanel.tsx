import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Editor } from "@monaco-editor/react";
import { useCppLsp } from "@/lib/lsp/useCppLsp";

import type Language from "../../types/Language";
import type * as Monaco from "monaco-editor";

import { useEffect, useRef, useState } from "react";

type RightPanelProps = {
  selectedLanguageObject: Language | undefined;
  code: string;
  setCode: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: () => Promise<void>;
};

export default function RightPanel({
  selectedLanguageObject,
  code,
  setCode,
  handleSubmit,
}: RightPanelProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  const isCpp = selectedLanguageObject?.codeName === 'cpp';
  const [lspEnabled, setLspEnabled] = useState(false);
  const { lspState, attachLsp, detachLsp } = useCppLsp(isCpp && lspEnabled);

  useEffect(() => {
    if (isCpp && lspEnabled && editorRef.current && monacoRef.current) {
      attachLsp(editorRef.current, monacoRef.current);
    } else {
      detachLsp();
    }
  }, [isCpp, lspEnabled, attachLsp, detachLsp]);

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
              lspEnabled
                ? lspState === 'ready'
                  ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                  : lspState === 'connecting'
                    ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
                    : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <span
              className={cn(
                'inline-block w-1.5 h-1.5 rounded-full',
                lspEnabled
                  ? lspState === 'ready'
                    ? 'bg-green-500'
                    : lspState === 'connecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                  : 'bg-muted-foreground'
              )}
            />

            {lspEnabled
              ? lspState === 'ready'
                ? 'clangd on'
                : lspState === 'connecting'
                  ? 'connecting…'
                  : lspState === 'error'
                    ? 'LSP error'
                    : 'clangd'
              : 'clangd off'}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={getEditorLanguage(selectedLanguageObject?.codeName)}
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="vs-dark"
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