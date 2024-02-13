import { Box, Typography } from "@mui/material";
import { useGetProblemBySlug } from "../../data/useGetProblem";
import Markdown from "react-markdown";
import SampleTestCases from "./SampleTestCases";

const ProblemPane = () => {
  const { problem } = useGetProblemBySlug();

  return (
    <Box p={4}>
      <Typography>
        <Markdown>
          {problem?.description}
        </Markdown>
      </Typography>
      <SampleTestCases testCases={problem?.testCases || []} />
    </Box>
  );
};

export default ProblemPane;
