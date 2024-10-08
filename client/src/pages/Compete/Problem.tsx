import {
  Box,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState } from "react";
import Paper from "../../components/Paper";
import CodeEditorPane from "./CodeEditorPane";
import { useGetProblemBySlug } from "../../data/useGetProblem";
import SampleTestCases from "./SampleTestCases";
import {
  KeyboardDoubleArrowLeft,
  KeyboardDoubleArrowRight,
} from "@mui/icons-material";
import Markdown from "react-markdown";

const ProblemPane = () => {
  const { problem } = useGetProblemBySlug();

  const [isExpanded, setIsExpanded] = useState(false);
  const editorPaneSize = isExpanded ? 8 : 6;
  const descriptionPaneSize = 12 - editorPaneSize;

  const tooltipMessage = isExpanded ? "Minimize code editor" : "Maximize code editor";

  const handleResize = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsExpanded(!isExpanded);
  };

  const resizeButton = (<Tooltip title={tooltipMessage} key={isExpanded ? "true" : "false"}>
    <IconButton onClick={handleResize}>
      {isExpanded ? (
        <KeyboardDoubleArrowRight />
      ) : (
        <KeyboardDoubleArrowLeft />
      )}
    </IconButton>
  </Tooltip>);

  return (
    <Grid container spacing={4} sx={{
      position: "relative",
      height: "76vh",
    }}>
      <Grid item xs={descriptionPaneSize} height="inherit">
        <Paper >
          <Box>
            <Typography>
              <Markdown>{problem?.description}</Markdown>
            </Typography>
            <SampleTestCases testCases={problem?.testCases || []} />
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={editorPaneSize} height="inherit" sx={{
        position: "relative",
      }}>
        <Box sx={{
          position: "absolute",
          left: -3,
          height: '100%',
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>
          {resizeButton}
        </Box>
        <Paper>
          <CodeEditorPane />
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ProblemPane;
