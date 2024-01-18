import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

const Header = () => {
  return (
    <Box flexGrow={1}>
      <AppBar position="static" >
        <Toolbar sx={{ marginX: "50px" }}>

          <Box flexGrow={1} display={"inline-flex"}>
            <img src="/logo.svg" alt="logo" />
            <Typography color={"primary"} marginX={1} variant="h6" textTransform={"uppercase"}>
              Colosseum
            </Typography>
          </Box>

          <Box>
            <Button color="inherit">Home</Button>
            <Button color="inherit">Compete</Button>
          </Box>

          <Box flexGrow={1} display={"flex"} justifyContent={"flex-end"} gap={1}>
            <Button variant="outlined" color="inherit">Login</Button>
            <Button variant="contained" color="primary">Sign up</Button>
          </Box>

        </Toolbar>
      </AppBar>
    </Box>

  );
}

export default Header;