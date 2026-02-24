import {
  Accordion,
  AccordionSummary,
  Typography,
  AccordionDetails,
  Box,
} from "@mui/material";
import Alert from "@mui/material/Alert";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EmptySectionPlaceholder from "../../components/EmptySectionPlaceholder";

const SubmissionStatus = () => {
  // TODO: Dummy data, should be replaced when connected to the back-end
  const testCases = [
    {
      input:
        "First line contains T that denotes the number of test cases. This is followed by T lines, each containing an integer, N.",
      expected:
        "First line contains T that denotes the number of test cases. This is followed by T lines, each containing an integer, N.",
      actual:
        "For each test case, print an integer that denotes the sum of all the multiples of 3 or 5 below N.",
      logs: "All good",
      status: "Passed",
    },
    {
      input:
        "First line contains T that denotes the number of test cases. This is followed by T lines, each containing an integer, N.",
      expected:
        "First line contains T that denotes the number of test cases. This is followed by T lines, each containing an integer, N.",
      actual:
        "For each test case, print an integer that denotes the sum of all the multiples of 3 or 5 below N.",
      logs: "All good",
      status: "Passed",
    },
    {
      input:
        "First line contains T that denotes the number of test cases. This is followed by T lines, each containing an integer, N.",
      expected:
        "First line contains T that denotes the number of test cases. This is followed by T lines, each containing an integer, N.",
      actual:
        "For each test case, print an integer that denotes the sum of all the multiples of 3 or 5 below N.",
      logs: "Time limit exceeded",
      status: "Failed",
    },
    {
      input:
        "First line contains T that denotes the number of test cases. This is followed by T lines, each containing an integer, N.",
      expected:
        "First line contains T that denotes the number of test cases. This is followed by T lines, each containing an integer, N.",
      actual:
        "For each test case, print an integer that denotes the sum of all the multiples of 3 or 5 below N.",
      logs: "All good",
      status: "Passed",
    },
  ];
  const totalPassedCases = testCases.filter(
    (value) => value.status === "Passed"
  ).length;
  const isSubmissionStatusFailed = testCases.length - totalPassedCases > 0;

  const alertLabel = isSubmissionStatusFailed
    ? `Failed ${totalPassedCases}/${testCases.length}`
    : `Passed ${testCases.length}/${testCases.length}`;
  const alertSeverity = isSubmissionStatusFailed ? "error" : "success";

  if (testCases.length === 0) {
    return (
      <EmptySectionPlaceholder message="Run or submit your code to view the status" />
    );
  }

  return (
    <Box height="inherit" overflow="hidden">
      <Alert variant="filled" severity={alertSeverity}>
        {alertLabel}
      </Alert>

      <div style={{ height: "80vh", overflow: "scroll" }}>
        {testCases.map((testCase, index) => {
          const testCaseStatusIcon =
            testCase.status === "Passed" ? (
              <CheckIcon style={{ paddingLeft: 6, color: "green" }} />
            ) : (
              <CloseIcon style={{ paddingLeft: 6, color: "#d32f2f" }} />
            );

          return (
            <Accordion
              key={index}
              sx={{
                "&:hover": {
                  cursor: "pointer",
                },
              }}
            >
              <AccordionSummary style={{ display: "flex" }}>
                <Typography
                  color="text.secondary"
                  variant="caption"
                  style={{ alignContent: "center" }}
                >
                  TEST CASE #{index + 1}
                </Typography>
                {testCaseStatusIcon}
              </AccordionSummary>
              <AccordionDetails style={{ marginLeft: 4, borderRadius: 2 }}>
                <Typography variant="subtitle2">Input Format</Typography>
                <Typography variant="caption">{testCase.input}</Typography>

                <Typography variant="subtitle2" style={{ marginTop: 16 }}>
                  Expected
                </Typography>
                <Typography variant="caption">{testCase.expected}</Typography>

                <Typography variant="subtitle2" style={{ marginTop: 16 }}>
                  Actual
                </Typography>
                <Typography variant="caption">{testCase.actual}</Typography>

                <Typography variant="subtitle2" style={{ marginTop: 16 }}>
                  Logs
                </Typography>
                <Box
                  component="textarea"
                  color="text.primary"
                  bgcolor="text.disabled"
                  width="100%"
                  padding="inherit"
                  borderRadius={1}
                  borderColor="text.disabled"
                  style={{ resize: "none" }}
                  disabled
                  value={testCase.logs}
                />
              </AccordionDetails>
            </Accordion>
          );
        })}
      </div>
    </Box>
  );
};
export default SubmissionStatus;
