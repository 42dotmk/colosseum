import { Box, Tab, Tabs } from "@mui/material";
import { SyntheticEvent, useState } from "react";
import ProblemTab from './Problem';
import SubmissionsTab from './Submissions';

const CompeteTabs = () => {
  const [value, setValue] = useState(0);

  const handleChange = (_: SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ margin: 2, marginTop: 20 }}>
      <Tabs value={value} onChange={handleChange} sx={{ width: "100%", marginBottom: 3 }}>
        <Tab label="Problem" />
        <Tab label="Submissions (0)" />
        <Tab label="Discussion" disabled />
      </Tabs>

      {value === 0 && (<ProblemTab />)}
      {value === 1 && (<SubmissionsTab />)}
    </Box>
  );
};

export default CompeteTabs;
