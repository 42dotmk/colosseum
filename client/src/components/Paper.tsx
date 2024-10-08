import { Paper as MaterialPaper, PaperOwnProps } from '@mui/material';

type Props = {
  width?: string;
  height?: string;
  padding?: string;
} & PaperOwnProps;

const Paper = ({ children, width, height, padding, sx }: Props) => (
  <MaterialPaper
    sx={{
      height: height ?? '100%',
      width: width ?? '100%',
      background: 'background.paper',
      borderRadius: '12px',
      padding: padding ?? 3,
      overflow: 'scroll',
      ...sx,
    }}
  >
    {children}
  </MaterialPaper>
);
export default Paper;
