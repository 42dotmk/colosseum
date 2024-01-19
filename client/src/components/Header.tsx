import {
  Toolbar,
  Box,
  Typography,
  Button,
  AppBar,
  Tab,
  Tabs,
} from "@mui/material";
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const { pathname } = useLocation();

  return (
    <Box flexGrow={1}>
      <AppBar
        position="static"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar sx={{ marginX: "50px" }}>
          <Box flexGrow={1} display={"inline-flex"}>
            <img src="/logo.svg" alt="logo" />
            <Typography
              color={"primary"}
              marginX={1}
              variant="h6"
              textTransform={"uppercase"}
            >
              Colosseum
            </Typography>
          </Box>

          <Box>
            <Tabs
              value={pathname}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
            >
              <Tab label="Home" component={Link} to="/home" value="/home" />
              <Tab label="Compete" component={Link} to="/compete" value="/compete" />
            </Tabs>
          </Box>

          <Box
            flexGrow={1}
            display={"flex"}
            justifyContent={"flex-end"}
            gap={1}
          >
            <Button variant="outlined" color="inherit">
              Login
            </Button>
            <Button variant="contained" color="primary">
              Sign up
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Header;
