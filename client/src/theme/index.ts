import { ThemeOptions, createTheme } from '@mui/material/styles';

const themeOptions: ThemeOptions = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFC948',
      dark: '#b38d32',
      light: '#ffd97f',
      contrastText: '#0F0F11',
    },
    secondary: {
      main: '#EEEEEE',
      light: '#ffffff',
      dark: '#9B9B9B',
    },
    background: {
      default: '#0F0F11',
      paper: '#0F0F11',
    },
    text: {
      primary: '#EEEEEE',
      secondary: '#9B9B9B',
      disabled: '#3E3E42',
    },
    error: {
      main: '#E53E3E',
      light: '#FC8181',
      dark: '#9B2C2C',
    },
    warning: {
      main: '#ED8936',
      dark: '#9C4221',
      light: '#F0A05E',
      contrastText: '#0F0F11',
    },
    divider: '#3E3E42',
  },
});

export default themeOptions;