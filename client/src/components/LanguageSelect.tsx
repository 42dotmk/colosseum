import { Box, FormControl, MenuItem, Select, Typography } from "@mui/material";

type Props = {
  currentLanguage: string;
  languages: string[];
  setCurrentLanguage: (language: string) => void;
};

const LanguageSelect = ({
  currentLanguage,
  languages,
  setCurrentLanguage,
}: Props) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Typography color="typography.subtitle2" variant="subtitle2" align="left">
      SELECT LANGUAGE:
    </Typography>
    <FormControl sx={{ width: "150px" }} size="small">
      <Select
        size="small"
        value={currentLanguage}
        onChange={(e) => setCurrentLanguage(e.target.value)}
        displayEmpty
        inputProps={{ "aria-label": "Without label" }}
        sx={{
          "& .MuiOutlinedInput-notchedOutline": {
            border: 1,
            borderRadius: 1.5,
            borderColor: "text.disabled",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            border: 1,
            borderRadius: 1.5,
            borderColor: "text.disabled",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            border: 1,
            borderRadius: 1.5,
            borderColor: "text.disabled",
          },
        }}
      >
        {languages.map((language) => (
          <MenuItem
            key={language}
            value={language}
            sx={{
              "&:hover .Mui-selected": {
                backgroundColor: "text.disabled",
              },
              "&.Mui-selected": {
                backgroundColor: "text.disabled",
              },
            }}
          >
            {language}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  </Box>
);
export default LanguageSelect;
