import { Card, CardActionArea, CardContent } from "@mui/material";
import ProgrammingLanguages from "./ProgrammingLanguages";
import Buttons from "./Buttons";
import EventMetadata from "./EventMetadata";
import SponsoredBy from "./SponsoredBy";

const EventCard = () => {
    return (
        <Card
            sx={{
                borderRadius: 2,
                marginX: 16,
                boxShadow: "0px 0px 1.5px 0px #fff",
            }}
        >
            <CardActionArea
                sx={{ padding: 2 }}
            >
                <CardContent
                    sx={{ display: "flex", flexDirection: "row", }}
                >
                    <EventMetadata />

                    <ProgrammingLanguages languages={["NodeJS", "NodeJS", "NodeJS", "NodeJS", "NodeJS", "NodeJS"]} />

                </CardContent>

                <CardContent
                    sx={{ display: "flex" }}
                >
                    <Buttons />

                    <SponsoredBy />
                </CardContent>

            </CardActionArea>
        </Card>
    );
};

export default EventCard;