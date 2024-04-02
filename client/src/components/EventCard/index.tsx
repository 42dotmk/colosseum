import { Card, CardActionArea, CardContent} from "@mui/material";
import ProgrammingLanguages from "./ProgrammingLanguages";
import Buttons from "./Buttons";
import EventMetadata from "./EventMetadata";
import SponsoredBy from "./SponsoredBy";

const EventCard = () => {
    return (
        <Card
            sx={{
                width: "80%",
                borderRadius: "10px",
                margin: "auto",
                marginTop: "5%",
                boxShadow: "0px 0px 1.5px 0px #fff",
            }}
        >
            <CardActionArea
                sx={{ padding: "1.5%", }}
            >
                <CardContent
                    sx={{ display: "flex", width: "100%", }}
                >
                    <EventMetadata />
                    
                    <ProgrammingLanguages languages={["NodeJS", "NodeJS", "NodeJS", "NodeJS", "NodeJS", "NodeJS"]} />

                </CardContent>

                <CardContent
                    sx={{ display: "flex", width: "100%", }}
                >
                    <Buttons />

                    <SponsoredBy />
                </CardContent> 

            </CardActionArea>
        </Card>
    );
};

export default EventCard;