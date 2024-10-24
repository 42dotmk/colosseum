import { Share } from "@mui/icons-material";
import { Box, Button, CardContent } from "@mui/material";
import { FULL_WIDTH, FULL_HEIGHT } from "../../theme";

const Buttons = () => {

    return (
        <CardContent
            sx={{
                display: "flex",
                width: FULL_WIDTH,
            }}
        >
            <Box
                sx={{
                    width: FULL_WIDTH,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                }}
            >
                <Button
                    variant="contained"
                    color="primary"
                    sx={{
                        height: FULL_HEIGHT,
                        fontSize: 19,
                        marginRight: 2,
                        borderRadius: 2,
                    }}
                >
                    REGISTER NOW
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    sx={{
                        height: FULL_HEIGHT,
                        fontSize: 17.5,
                        marginRight: 2,
                        borderRadius: 2,
                    }}
                >
                    PREVIEW COMPETITION
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    sx={{
                        height: FULL_HEIGHT,
                        justifyContent: "center",
                        alignContent: "center",
                        padding: 2,
                        borderRadius: 2,
                    }}
                >
                    <Share />
                </Button>
            </Box>
        </CardContent>
    );
};

export default Buttons;