import { Box, Button, Grid } from "@mui/material";
import CodeEditor from "../../../components/CodeEditor";
import LanguageSelect from "../../../components/LanguageSelect";
import { useState } from 'react';

type Props = {
  supportedLanguages: string[];
};

const CodeEditorPane = ({ supportedLanguages }: Props) => {
  const [currentLanguage, setCurrentLanguage] = useState(supportedLanguages[0]);
  const [currentCode, setCurrentCode] = useState([
    "const message: string = 'Hello, World!';",
    "console.log(message);",
  ]);
 
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        gap: 2,
      }}
    >
      <LanguageSelect 
        currentLanguage={currentLanguage}
        languages={supportedLanguages}
        setCurrentLanguage={(e) => setCurrentLanguage(e)}
      />
      <CodeEditor
        language={currentLanguage.toLowerCase()}
        code={currentCode}
        onCodeChange={() => setCurrentCode}
      />
      <Grid container justifyContent="flex-end">
        <Button
          variant="outlined"
          color="secondary"
          style={{ margin: 3 }}
          sx={{
            border: 1,
            borderRadius: 1.5,
            borderColor: "text.disabled",
          }}
        >
          RUN CODE
        </Button>
        <Button
          variant="contained"
          style={{ margin: 3 }}
          sx={{
            border: 1,
            borderRadius: 1.5,
            borderColor: "text.disabled",
          }}
        >
          SUBMIT CODE
        </Button>
      </Grid>
    </Box>
  );
};
export default CodeEditorPane;
