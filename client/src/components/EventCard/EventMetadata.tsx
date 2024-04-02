import { Box, Typography } from "@mui/material";
import IconLabels from "./IconLabel";
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';


const CardHeading = "The Lost Beginning";
const CompetitionDate = "JAN 13, 2024";
const CompetitionTime = "19:00";
const CompetitionPlace = "BASE42";

const EventMetadata = () => {

    return (
        <Box
            sx={{
                width: "70%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
            }}
        >
            <Typography gutterBottom variant="h4" component="div" width={"70%"}>
                {CardHeading}
            </Typography>

            <Typography variant="body1" color="text.secondary">
                {CompetitionDate} | {CompetitionTime} | {CompetitionPlace}
            </Typography>
            
            <IconLabels  iconLabels={[
                {icon: <LocalFireDepartmentIcon/>, label: "75", containerSx:undefined},
                {icon: <LocalFireDepartmentIcon/>, label: "224", containerSx:undefined}, 
            ]}/>
        </Box>
    );
};

export default EventMetadata;