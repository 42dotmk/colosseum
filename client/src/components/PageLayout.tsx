import { Grid } from "@mui/material";
import { ReactNode } from "react";

type Props = {
  leftGridChildren: ReactNode;
  rightGridChildren: ReactNode;
};

const PageLayout = ({
  leftGridChildren,
  rightGridChildren,
}: Props) => {
  return (
    <Grid container bgcolor={"background.default"}>
      <Grid item xs={9} sx={{ height: '100%' }}>
        {leftGridChildren}
      </Grid>
      <Grid item xs={3} sx={{ borderLeft: 1, borderColor: 'divider', height: '100%' }}>
        {rightGridChildren}
      </Grid>
    </Grid>
  );
};

export default PageLayout;
