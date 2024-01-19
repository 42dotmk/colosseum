import { Grid, Typography } from "@mui/material";

const HomePage = () => {
  return (
    <Grid container>
      <Grid item xs={9} height={"100vh"} width={"100vw"}>
        <Typography
          color={"primary"}
          marginX={1}
          variant="h6"
          textTransform={"uppercase"}
        >
          Landing page
        </Typography>
      </Grid>
    </Grid>
  );
};

export default HomePage;
