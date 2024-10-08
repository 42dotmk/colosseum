import {
  Toolbar,
  Box,
  Typography,
  Button,
  AppBar,
  Tab,
  Tabs,
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const { pathname } = useLocation();

  return (
    <Box flexGrow={1}>
      <AppBar
        position="static"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ backgroundColor: "background.default" }}>
          <Box flexGrow={1} display={"inline-flex"} marginLeft={5}>
            <Link to="/" style={{ display: "flex", textDecoration: "none" }}>
              <img src="/logo.svg" alt="logo" />
              <Typography color="primary" variant="h6" textTransform="uppercase" marginX={1}>
                Colosseum
              </Typography>
            </Link>
          </Box>

          <Box>
            <Tabs
              value={pathname}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              role="navigation"
            >
              <Tab label="Home" component={Link} to="/home" value="/home" color="text.primary" />
              <Tab label="Compete" component={Link} to="/compete" value="/compete" color="text.primary" />
            </Tabs>
          </Box>

          <Box flexGrow={1} display="flex" justifyContent="flex-end" gap={1} marginRight={5}>
            <Button variant="outlined" color="secondary" size="medium">
              Log in
            </Button>
            <Button variant="contained" color="primary" size="medium">
              Sign up
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Header;
