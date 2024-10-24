import { Card, CardActionArea, CardContent } from "@mui/material";
import ProgrammingLanguages from "./ProgrammingLanguages";
import Buttons from "./Buttons";
import EventMetadata from "./EventMetadata";
import SponsoredBy from "./SponsoredBy";
import themeOptions from "../../theme";

const EventCard = () => {
    return (
        <Card
            sx={{
                borderRadius: 2,
                marginX: 16,
                boxShadow: themeOptions.shadows?.[1],
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