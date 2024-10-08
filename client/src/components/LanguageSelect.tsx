import { Box, FormControl, MenuItem, Select, SelectChangeEvent, Tooltip } from "@mui/material";
import { useState } from 'react';

type Props = {
  languages: string[];
};

const LanguageSelect = ({ languages }: Props) => {
  const [currentLanguage, setCurrentLanguage] = useState(languages[0]);

  const handleLanguageChange = (event: SelectChangeEvent) => {
    const { target: { value } } = event;
    setCurrentLanguage(value);
  }

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
    }}>
      <FormControl sx={{ width: "150px" }} size="small">
        <Tooltip title={currentLanguage} placement="right" key={currentLanguage}>
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
        </Tooltip>
      </FormControl>
    </Box>
  );
};
export default LanguageSelect;
