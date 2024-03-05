import {
  Box,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  Zoom,
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
  const [descriptionPaneSize, setDescriptionPaneSize] = useState(7);
  const [editorPaneSize, setEditorPaneSize] = useState(3);
  const [paneWidth, setPaneWidth] = useState(30);
  const [tooltipMessage, setTooltipMessage] = useState("Maximize code editor");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleResize = (event: any) => {
    event.preventDefault();

    setDescriptionPaneSize((previousPaneSize) =>
      previousPaneSize === 7 ? 3 : 7
    );
    setEditorPaneSize((previousPaneSize) => (previousPaneSize === 9 ? 3 : 9));
    setPaneWidth((previousPaneWidth) => (previousPaneWidth === 53 ? 30 : 53));
    setTooltipMessage(() =>
      paneWidth === 53 ? "Maximize code editor" : "Minimize code editor"
    );
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
        <Paper height={"75vh"} width={`${paneWidth}vw`}>
          <Grid
            container
            sx={{
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Grid item xs={1}>
              <Tooltip
                disableTouchListener
                disableFocusListener
                TransitionComponent={Zoom}
                title={tooltipMessage}
              >
                <IconButton onClick={handleResize}>
                  {paneWidth === 53 ? (
                    <KeyboardDoubleArrowRight />
                  ) : (
                    <KeyboardDoubleArrowLeft />
                  )}
                </IconButton>
              </Tooltip>
            </Grid>
            <Grid item xs={11}>
              <CodeEditorPane />
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ProblemPane;
