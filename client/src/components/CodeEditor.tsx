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
};

const CodeEditor = ({ language, code, readOnly }: Props) => {
  return (
    <Box
      sx={{
        backgroundColor: "#282A36",
        minWidth: "20vw",
        width: "inherit",
        height: "55vh",
        border: 1,
        borderColor: "divider",
        borderRadius: "12px",
        justifyItems: "flex-end",
        paddingTop: 2,
        paddingBottom: 2,
      }}
    >
        <Editor
          height="100%"
          width="inherit"
          theme="editorTheme"
          defaultLanguage={language}
          value={code.join("\n")}
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
