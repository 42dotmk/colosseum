import { Box, Typography } from "@mui/material";
import { images } from "./ProgrammingLanguages";
import { FULL_HEIGHT, FULL_WIDTH } from "../../theme";

const SponsoredBy = () => {

    return (
        <Box
            sx={{
                width: FULL_WIDTH,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                padding: 1,
            }}
        >
            <Typography
                variant="body1"
                color="text.secondary"
                noWrap
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
                Sponsored by:
            </Typography>
            <Box
                component="img"
                sx={{
                    height: FULL_HEIGHT,
                    padding: 0.2,
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