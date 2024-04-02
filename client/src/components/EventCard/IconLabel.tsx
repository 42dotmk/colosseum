import { Box, Icon, SxProps, Theme, Typography } from "@mui/material";
import { ReactElement } from "react";

const IconLabel = ({icon, label, containerSx}:{icon: ReactElement, label: string, containerSx: SxProps<Theme> | undefined}) => {
    return (
        <Box
            sx={{
                display: "flex",
                marginTop: "3%",
                marginRight: "3%", ...containerSx
            }}
        >
            <Icon>
                {icon}
            </Icon>
            <Typography>
                {label}
            </Typography>
        </Box>
    );
};

const IconLabels = ({iconLabels}:{iconLabels: {icon: ReactElement, label: string, containerSx: SxProps<Theme> | undefined}[]}) => {
    return (
        <Box
            sx={{
                display: "flex",
                width: "70%",
            }}
        >
            {iconLabels.map((iconLabel) => (<IconLabel icon={iconLabel.icon} label={iconLabel.label} containerSx={iconLabel.containerSx} />))}
        </Box>
    );
}

export default IconLabels;