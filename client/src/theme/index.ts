import { ThemeOptions } from '@mui/material/styles';

const themeConfig: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFC948',
      dark: '#ECB73F',
    },
    secondary: {
      main: '#9c27b0',
    },
    divider: '#3E3E42',
    background: {
      default: '#0F0F11',
    },
  },
  shape: {
    borderRadius: 12,
  },
};

export default themeConfig;