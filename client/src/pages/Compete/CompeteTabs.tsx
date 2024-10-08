import { Box, Tab, Tabs } from "@mui/material";
import { SyntheticEvent, useState } from "react";
import ProblemPane from "./Problem";

const CompeteTabs = () => {
  const [value, setValue] = useState(0);

  const handleChange = (_: SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ margin: 5 }}>
      <Tabs value={value} onChange={handleChange} aria-label="basic tabs example" sx={{ width: "100%" }}>
        <Tab label="Problem" />
        <Tab label="Submissions (0)" />
        <Tab label="Discussion" />
      </Tabs>
      {value === 0 && (<ProblemPane />)}
    </Box>
  );
};

export default CompeteTabs;
