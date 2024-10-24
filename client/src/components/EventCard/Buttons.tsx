import { Share } from "@mui/icons-material";
import { Box, Button, CardContent, Typography } from "@mui/material";
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
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    <Typography
                        color="black"
                        noWrap
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        REGISTER NOW
                    </Typography>
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    sx={{
                        height: FULL_HEIGHT,
                        fontSize: 17.5,
                        marginRight: 2,
                        borderRadius: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    <Typography
                        noWrap
                        sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                        PREVIEW COMPETITION
                    </Typography>
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
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    <Share />
                </Button>
            </Box>
        </CardContent >
    );
};

export default Buttons;