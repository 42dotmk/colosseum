import { Box, Typography } from "@mui/material";
import { Language, thresholdOfLanguages } from "./ProgrammingLanguages";

const ExtraLanguages = ({ languages }: { languages: Language[] }) => {
    return (
        <Box
            sx={{
                width: 90,
                height: 60,
                display: "flex",
                direction: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "text.disabled",
                borderRadius: 1,
            }}
        >
            <Typography
                sx={{
                    fontSize: { xs: 16, sm: 18, md: 20, lg: 22, xl: 24 },
                }}
            >
                +{languages.length - thresholdOfLanguages}
            </Typography>
        </Box>
    );
};

export default ExtraLanguages;