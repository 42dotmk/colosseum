import { Grid, Tab, Tabs } from "@mui/material";
import { SyntheticEvent, useState } from "react";
import SubmissionStatus from "./SubmissionStatus";

const InfoTabs = () => {
  const [value, setValue] = useState(0);

  const handleChange = (_: SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Grid container sx={{ marginTop: 3, padding: 2 }} direction={"column"}>
      <Grid item>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
          variant="fullWidth"
          style={{ width: "100%" }}
        >
          <Tab label="Submissions Status" />
          <Tab label="Announcements (0)" />
        </Tabs>
      </Grid>
      <Grid item>
      {value === 0 && (<SubmissionStatus />)}
      </Grid>
    </Grid>
  );
};

export default InfoTabs;
