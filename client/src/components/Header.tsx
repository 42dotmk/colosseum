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

function Header() {
  const { pathname } = useLocation();

  return (
    <Box flexGrow={1}>
      <AppBar
        position="static"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ backgroundColor: 'background.default' }}>
          <Box flexGrow={1} sx={{ display: 'inline-flex', marginX: 3 }}>
            <img src="/logo.svg" alt="logo" />
            <Typography color="primary" variant="h6" textTransform="uppercase" marginX={1}>
              Colosseum
            </Typography>
          </Box>

          <Box>
            <Tabs
              value={pathname}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              role="navigation"

            >
              <Tab label="Home" component={Link} to="/home" value="/home" sx={{ color: 'text.primary' }} />
              <Tab label="Compete" component={Link} to="/compete" value="/compete" sx={{ color: 'text.primary' }} />
            </Tabs>
          </Box>

          <Box
            flexGrow={1}
            sx={{
              display: 'flex', justifyContent: 'flex-end', marginX: 3, gap: 1,
            }}
          >
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
}

export default Header;
