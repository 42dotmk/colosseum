import { Paper as MaterialPaper } from '@mui/material';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  width?: string;
  height?: string;
};

const Paper = ({ children, width, height }: Props) => (
  <MaterialPaper
    sx={{
      height: height ?? '100%',
      width: width ?? '100%',
      background: 'background.paper',
      borderRadius: '12px',
      marginTop: 3,
    }}
  >
    {children}
  </MaterialPaper>
);
export default Paper;
