import Grid2 from "@mui/material/Unstable_Grid2";
import EventCard from "../../components/EventCard";


const EventList = () => {
    return (
        <Grid2 container spacing={5}>
            <Grid2 lg={12}>
                <EventCard />
            </Grid2>
            <Grid2 lg={12}>
                <EventCard />
            </Grid2>
        </Grid2>
    );
};

export default EventList;