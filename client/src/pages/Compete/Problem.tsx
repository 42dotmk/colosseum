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
import Markdown from "react-markdown";
import SampleTestCases from "./SampleTestCases";
import {
  KeyboardDoubleArrowLeft,
  KeyboardDoubleArrowRight,
} from "@mui/icons-material";

const ProblemPane = () => {
  const { problem } = useGetProblemBySlug();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const editorPaneSize = isExpanded ? 9 : 5;
  const descriptionPaneSize = 12 - editorPaneSize;

  const tooltipMessage = isExpanded ? "Minimize code editor" : "Maximize code editor";

  const handleResize = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsExpanded(!isExpanded);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={descriptionPaneSize} height="inherit">
        <Paper height={"75vh"}>
          <Box>
            <Typography>
              <Markdown>{problem?.description}</Markdown>
            </Typography>
            <SampleTestCases testCases={problem?.testCases || []} />
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={editorPaneSize} height="inherit">
        <Paper height={"75vh"} width={`100%`} 
          sx={{
            paddingLeft: 0,
          }}
        >
          <Grid
            container
            sx={{
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Grid item xs={1}>
              <Tooltip title={tooltipMessage} key={isExpanded ? "true" : "false"}>
                <IconButton onClick={handleResize}>
                  {isExpanded ? (
                    <KeyboardDoubleArrowRight />
                  ) : (
                    <KeyboardDoubleArrowLeft />
                  )}
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs={11} sx={{height: '100%'}}>
              <CodeEditorPane />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ProblemPane;
