import { Grid } from "@mui/material";
import { ReactNode } from "react";

type Props = {
  centerElementChildren: ReactNode;
  rightPanelChildren: ReactNode;
};

const CompetePageLayout = ({
  centerElementChildren,
  rightPanelChildren,
}: Props) => {
  return (
    <Grid container bgcolor={"background.default"}>
      <Grid item xs={9} height={"100vh"} width={"100vw"}>
        {centerElementChildren}
      </Grid>
      <Grid
        item
        xs={3}
        height={"100vh"}
        width={"100vw"}
        sx={{
          borderLeft: "1px solid grey",
          padding: 1,
        }}
      >
        {rightPanelChildren}
      </Grid>
    </Grid>
  );
};

export default CompetePageLayout;
