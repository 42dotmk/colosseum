import { Typography } from "@mui/material";
import CompetePageLayout from "../../layouts/CompetePageLayout";

const CompetePage = () => {
  return (
    <CompetePageLayout
      centerElementChildren={
        <Typography
          color={"primary"}
          marginX={1}
          variant="h6"
          textTransform={"uppercase"}
        >
          Center page elements
        </Typography>
      }
      rightPanelChildren={
        <Typography
          color={"primary"}
          marginX={1}
          variant="h6"
          textTransform={"uppercase"}
        >
          Right panel elements
        </Typography>
      }
    />
  );
};

export default CompetePage;
