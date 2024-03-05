import { FormControl, Grid, MenuItem, Select, SelectChangeEvent, Typography } from "@mui/material";
import { useState } from 'react';

type Props = {
  languages: string[];
};

const LanguageSelect = ({ languages }: Props) => {
  const [currentLanguage, setCurrentLanguage] = useState(languages[0]);

  const handleLanguageChange = (event: SelectChangeEvent) => {
    const { target: { value }} = event;
    setCurrentLanguage(value);
  }

  return (
    <Grid
      container
      sx={{
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Grid item xs={6}>
        <Typography
          color="typography.subtitle2"
          variant="subtitle2"
          align="left"
        >
          SELECT LANGUAGE:
        </Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: "right" }}>
        <FormControl sx={{ width: "10vw", textAlign: "center" }} size="small">
          <Select
            value={currentLanguage}
            onChange={handleLanguageChange}
            displayEmpty
            inputProps={{ "aria-label": "Without label" }}
          >
            {languages.map((language) => (
              <MenuItem value={language}>{language}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
};
export default LanguageSelect;
