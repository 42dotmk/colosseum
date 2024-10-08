import {
  Route, Routes, BrowserRouter, Navigate,
} from 'react-router-dom';
import { Grid } from '@mui/material';
import HomePage from './pages/Home';
import CompetePage from './pages/Compete';
import Header from './components/Header';

const App = () => (
  <BrowserRouter>
    <Grid container>
      <Grid item xs>
        <Header />
      </Grid>

      <Grid container bgcolor="background.default">
        <Routes>
          <Route index element={<Navigate to="/home" />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/compete" element={<CompetePage />} />
        </Routes>
      </Grid>
    </Grid>
  </BrowserRouter>
);

export default App;
