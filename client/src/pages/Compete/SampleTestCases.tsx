import { Box, Typography } from "@mui/material";
import { useGetProblemBySlug } from "../../data/useGetProblem";
import Markdown from "react-markdown";
import { TestCase } from "../../data/schema";

const SampleTestCases = ({ testCases }: { testCases: TestCase[] }) => {
  return (
    <Box>
      {testCases.map((testCase) => (
        <Box my={2}>
          <Typography>
            Input:
            <Markdown>
              {testCase?.input}
            </Markdown>
          </Typography>
          <Typography>
            Output:
            <Markdown>
              {testCase?.output}
            </Markdown>
          </Typography>
          <Typography>
            <Markdown>
              {testCase?.explanation}
            </Markdown>
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default SampleTestCases;
