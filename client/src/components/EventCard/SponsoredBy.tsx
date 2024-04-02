import { Box, Typography } from "@mui/material";
import { images } from "./ProgrammingLanguages";

const SponsoredBy = () => {

    return (
        <Box
            sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "flex-end",
            }}
        >
            <Typography variant="body1" color="text.secondary">
                Sponsored by:
            </Typography>
            <Box
                component="img"
                sx={{
                    width: "10%",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                }}
                alt={"NodeJS"}
                src={images["NodeJS"]}
            >
            </Box>
        </Box>
    );
};

export default SponsoredBy;