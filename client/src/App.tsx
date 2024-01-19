import { Route, Routes, BrowserRouter } from "react-router-dom";
import HomePage from "./pages/Home";
import CompetePage from "./pages/Compete";
import { Grid } from '@mui/material';
import Header from './components/Header';

const App = () => {
  return (
    <Grid container>
      <Grid item xs>
        <Header />
      </Grid>

      <Grid container bgcolor={"background.default"}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="compete" element={<CompetePage />} />
          </Routes>
        </BrowserRouter>
      </Grid>
    </Grid>
  );
};

export default App;
