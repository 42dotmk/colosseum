/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import _ from 'lodash';
import EmptySectionPlaceholder from '../../../components/EmptySectionPlaceholder';

type Props = {
  activeRow: any;
  data: any;
  handleRowClick: (submission: any) => void;
};

const SubmissionsTable = ({ activeRow, data, handleRowClick }: Props) => {
  if (data.length === 0) {
    return <EmptySectionPlaceholder message="There are currently no submissions." />
  }

  return (
    <TableContainer style={{ width: "inherit"}}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>NAME</TableCell>
            <TableCell>LANGUAGE</TableCell>
            <TableCell>STATUS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            data.map((submission: any, index: number) => {
              const isActiveRow = _.isEqual(submission, activeRow);
              const totalPassedCases = submission.testCases.filter(({ status }: { status: string }) => status === "Passed").length;
              const totalCases = submission.testCases.length;
            
              return (
                <TableRow
                  key={index}
                  hover
                  onClick={() => handleRowClick(submission)}
                  sx={{ 
                    bgcolor: isActiveRow ? "text.disabled" : "transparent",
                    '&:hover': {
                      cursor: 'pointer'
                    },
                  }}
                >
                  <TableCell component="th" scope="row">
                    Submission #{data.length - index}
                  </TableCell>
                  <TableCell>{submission.language}</TableCell>
                  <TableCell style={{ color: submission.status === "Passed" ? "green" : "#d32f2f" }}>
                    {submission.status} {totalPassedCases}/{totalCases}
                  </TableCell>
                </TableRow>
              );
            })
          }
        </TableBody>
      </Table>
    </TableContainer>
  );
};
export default SubmissionsTable;
