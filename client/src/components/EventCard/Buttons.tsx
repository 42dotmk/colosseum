import { Share } from "@mui/icons-material";
import { Box, Button, CardContent } from "@mui/material";


const Buttons = () => {

    return (
        <CardContent
            sx={{
                display: "flex",
                width: "100%",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "flex-start",
                }}
            >
                <Button 
                    variant="contained" 
                    color="primary"
                    sx={{
                        height: "100%",
                        fontSize: "1.1rem",
                        marginRight: "2%",
                        borderRadius: "7px",
                    }}
                >
                    REGISTER NOW
                </Button>
                <Button 
                    variant="outlined"
                    color="secondary"
                    sx={{
                        height: "100%",
                        fontSize: "1.1rem",
                        marginRight: "2%",
                        borderRadius: "7px",
                    }}
                >
                    PREVIEW COMPETITION
                </Button>
                <Button
                    variant="outlined"
                    color="secondary"
                    sx={{
                        height: "100%",
                        justifyContent: "center",
                        alignContent: "center",
                        padding: "1%",
                        borderRadius: "7px",
                    }}
                >
                    <Share />
                </Button>
            </Box>
        </CardContent>
    );
};

export default Buttons;