import { Editor, loader } from "@monaco-editor/react";
import { Box } from "@mui/material";

loader.init().then((monaco) => {
  monaco.editor.defineTheme("editorTheme", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#282A36",
    },
  });
});

type Props = {
  language: string;
  code: string[];
  readOnly?: boolean;
  onCodeChange?: (codeText: string) => void;
};

const CodeEditor = ({ language, code, readOnly, onCodeChange }: Props) => {
  const handleOnChange = (codeText: string) => {
    if (readOnly) return;
    onCodeChange?.(codeText);
  }

  return (
    <Box
      sx={{
        backgroundColor: "editor.background",
        width: "inherit",
        height: "100%",
        border: 1,
        borderColor: "divider",
        borderRadius: "12px",
        justifyItems: "flex-end",
        overflow: "hidden",
      }}
    >
      <Editor
        height="100%"
        width="inherit"
        theme="editorTheme"
        language={language}
        value={code.join('\n')}
        onChange={(e) => handleOnChange(e ?? "")}
        options={{
          readOnly,
          automaticLayout: true,
          renderLineHighlight: "none",
          lineNumbersMinChars: 4,
          overviewRulerLanes: 0,
          cursorStyle: "line-thin",
          scrollbar: {
            horizontalSliderSize: 4,
            verticalSliderSize: 8,
            alwaysConsumeMouseWheel: false,
          },
          scrollBeyondLastLine: false,
          minimap: {
            enabled: false,
          },
        }}
      />
    </Box>
  );
};
export default CodeEditor;
