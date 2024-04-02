import { Box, Typography } from "@mui/material";
import { Language, thresholdOfLanguages } from "./ProgrammingLanguages";

const ExtraLanguages = ({languages}:{languages: Language[]}) => {
    return (
        <Box
            sx={{
                display: "flex",
                direction: "row",
                alignItems: "center",
                justifyContent: "center",
                width: "8%",
                height: "100%",
                backgroundColor: "text.disabled",
                padding: "1.1%",
                borderRadius: "10%",
                marginRight: "1%",
            }}
        >
            <Typography
                sx={{
                    fontSize: { xs: "0.3rem", sm: "0.5rem", md: "0.7rem", lg: "1rem", xl: "1.4rem" },
                }}
            >
                + {languages.length - thresholdOfLanguages}
            </Typography>
        </Box>
    );
};

export default ExtraLanguages;