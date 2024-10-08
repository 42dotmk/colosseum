import { Box, Button, Grid } from "@mui/material";
import CodeEditor from "../../components/CodeEditor";
import LanguageSelect from "../../components/LanguageSelect";

const CodeEditorPane = () => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      height: "100%",
      gap: 2,
    }}
  >
    <LanguageSelect languages={["TypeScript", "JS"]} />
    <CodeEditor
      language="typescript"
      code={[
        "const message: string = 'Hello, World!';",
        "console.log(message);",
      ]}
    />
    <Grid container justifyContent="flex-end">
      <Button variant="outlined" color="secondary" style={{ margin: 3 }}>
        RUN CODE
      </Button>
      <Button variant="contained" style={{ margin: 3 }}>
        SUBMIT CODE
      </Button>
    </Grid>
  </Box>
);
export default CodeEditorPane;
