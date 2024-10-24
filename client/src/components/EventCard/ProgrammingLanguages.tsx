import { Box } from "@mui/material";
import NodeJS from "../../assets/ProgrammingLanguages/nodejs.png";
import ExtraLanguages from "./ExtraLanguages";

export const thresholdOfLanguages = 4;

export const languages = [
    "NodeJS",
] as const;

export type Language = typeof languages[number];

export const images: Record<Language, string> = {
    "NodeJS": NodeJS,
}

const ProgrammingLanguage = ({ language }: { language: Language }) => {
    return (
        <Box
            component="img"
            sx={{
                height: 60,
                width: 60,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "flex-end",
                backgroundColor: "text.disabled",
                padding: 1.5,
                borderRadius: 1,
                marginRight: 1,
                boxShadow: 1,
            }}
            alt={language}
            src={images[language]}
        >
        </Box>
    );
}


const ProgrammingLanguages = ({ languages }: { languages: Language[] }) => {

    const languagesSize = languages.length;

    const showDropdownButton = languagesSize > thresholdOfLanguages ? 1 : 0;

    return (
        <>
            {languages
                .slice(0, Math.min(languagesSize, thresholdOfLanguages - showDropdownButton))
                .map((language) => (<ProgrammingLanguage language={language} />)
                )}
            {showDropdownButton ? (<ExtraLanguages languages={languages} />) : null}
        </>
    );

};

export default ProgrammingLanguages;