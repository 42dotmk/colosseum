import Typography from '@mui/material/Typography';
import InfoIcon from '@mui/icons-material/Info';

type Props = {
  message: string;
};

const EmptySectionPlaceholder = ({ message }: Props) => (
  <div style={{ display: "flex" }}>
    <InfoIcon style={{ paddingRight: 6 }} />
    <Typography
      color="text.secondary"
      variant="caption"
      style={{ alignContent: "center" }}
    >
      {message}
    </Typography>
  </div>
);
export default EmptySectionPlaceholder;
