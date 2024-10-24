import { Box, Typography } from "@mui/material";
import IconLabels from "./IconLabel";
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { FULL_WIDTH } from "../../theme";

const CardHeading = "The Lost Beginning";
const CompetitionDate = "JAN 13, 2024";
const CompetitionTime = "19:00";
const CompetitionPlace = "BASE42";

const EventMetadata = () => {

    return (
        <Box
            sx={{
                marginLeft: 2.5,
                marginRight: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                width: FULL_WIDTH,
            }}
        >
            <Typography
                gutterBottom variant="h4"
                component="div"
                noWrap
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
                {CardHeading}
            </Typography>

            <Typography
                variant="body1"
                color="text.secondary"
                noWrap
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
                {CompetitionDate} | {CompetitionTime} | {CompetitionPlace}
            </Typography>

            <IconLabels iconLabels={[
                { icon: <LocalFireDepartmentIcon />, label: "75", containerSx: undefined },
                { icon: <LocalFireDepartmentIcon />, label: "224", containerSx: undefined },
            ]} />
        </Box>
    );
};

export default EventMetadata;