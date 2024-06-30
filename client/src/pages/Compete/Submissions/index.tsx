import SubmissionsTable from "./SubmissionsTable";
import SubmissionPreview from "./SubmissionPreview";
import { Grid } from "@mui/material";
import Paper from "../../../components/Paper";
import { useState } from 'react';

const SubmissionsTab = () => {
    // TODO: Dummy data, should be replaced when connected to the back-end
  const submissions = [
    {
      language: "TypeScript",
      code: [
        "const message: string = 'Hello, World!';",
        "console.log(message);",
      ],
      status: 'Passed',
      testCases: [
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
      ]
    }, {
      language: "Java",
      code: [
        "String message = \"Hello, World!\";",
        "System.out.println(message);",
      ],
      status: 'Failed',
      testCases: [
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
      ]
    }
  ];
  const [activeSubmission, setActiveSubmission] = useState(submissions[0]);

  return (
    <Grid container spacing={4} sx={{
      position: "relative",
      height: "76vh",
    }}>
      <Grid item xs={6} height="inherit">
        <Paper padding='0'>
          <SubmissionsTable
            activeRow={activeSubmission}
            data={submissions} 
            handleRowClick={setActiveSubmission} 
          />
        </Paper>
      </Grid>
      <Grid item xs={6} height="inherit">
        <Paper>
          <SubmissionPreview 
            language={activeSubmission.language} 
            code={activeSubmission.code}
          />
        </Paper>
      </Grid>
    </Grid>
  );
};
export default SubmissionsTab;
