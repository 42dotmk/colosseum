import { Button, Grid } from "@mui/material";
import CodeEditor from "../../components/CodeEditor";
import LanguageSelect from "../../components/LanguageSelect";

const CodeEditorPane = () => (
  <Grid
    container
    direction="column"
    spacing={1}
    justifyContent="flex-end"
    paddingTop={2}
    paddingRight={2}
    paddingLeft={2}
    paddingBottom={4}
  >
    <Grid item xs={12}>
      <LanguageSelect languages={["TypeScript", "Java"]} />
    </Grid>
    <Grid item xs={12} width="100%">
      <CodeEditor
        language="typescript"
        code={[
          "const message: string = 'Hello, World!';",
          "console.log(message);",
        ]}
      />
    </Grid>
    <Grid item xs={12}>
      <Grid container justifyContent="flex-end">
        <Button variant="outlined" color="secondary" style={{ margin: 3 }}>
          RUN CODE
        </Button>
        <Button variant="contained" style={{ margin: 3 }}>
          SUBMIT CODE
        </Button>
      </Grid>
    </Grid>
  </Grid>
);
export default CodeEditorPane;
