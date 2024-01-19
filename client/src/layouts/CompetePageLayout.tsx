import { Grid } from "@mui/material";
import { ReactNode } from "react";

type Props = {
  leftGridChildren: ReactNode;
  rightGridChildren: ReactNode;
};

const CompetePageLayout = ({
  leftGridChildren,
  rightGridChildren,
}: Props) => {
  return (
    <Grid container bgcolor={"background.default"}>
      <Grid item xs={9} height={"100vh"} width={"100vw"}>
        {leftGridChildren}
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
        {rightGridChildren}
      </Grid>
    </Grid>
  );
};

export default CompetePageLayout;
