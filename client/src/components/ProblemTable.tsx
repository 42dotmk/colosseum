import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import themeOptions from '../theme';
import { Button } from '@mui/material';

const ProblemTableCell = styled(TableCell)(() => ({
    [`&.${tableCellClasses.head}`]: {
        fontSize: 24,
        padding: "2vh",
        backgroundColor: themeOptions.palette?.background?.default,
        color: themeOptions.palette?.text?.primary,
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 24,
        padding: "2vh",
        borderTop: "3px solid grey",
        borderTopColor: themeOptions.palette?.text?.disabled,
        backgroundColor: themeOptions.palette?.background?.default,
        color: themeOptions.palette?.text?.primary,
    },
}));

function createData(
problemName: string,
points: number,
) {
    return { problemName, points };
}

const rows = [
    createData('Project Euler #1', 100),
    createData('Project Euler #2', 200),
    createData('Project Euler #3', 300),
    createData('Project Euler #4', 400),
];

function handleSolveProblemClick(problemName: string) {} //not implemented yet

export default function ProblemTable() {
    return (
        <TableContainer 
            component={Paper}
            sx={{
                margin: "auto", 
                width: "80%", 
                backgroundColor: themeOptions.palette?.background?.default,
            }}
        >
            <Table
                aria-label="problems table"
            >
                <TableHead>
                    <TableRow>
                        <ProblemTableCell
                            width={"35%"}
                        >
                            PROBLEM
                        </ProblemTableCell>
                        <ProblemTableCell 
                            align="left"
                            width={"36%"}
                        >
                            POINTS
                        </ProblemTableCell>
                        <ProblemTableCell>
                            SUBMISSIONS
                        </ProblemTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow 
                            key={row.problemName}
                        >
                            <ProblemTableCell 
                                scope="row"
                            >
                                {row.problemName}
                            </ProblemTableCell>
                            <ProblemTableCell 
                                align="left"
                            >
                                {row.points}
                            </ProblemTableCell>
                            <ProblemTableCell>
                                <Button 
                                    variant="outlined"
                                    sx={{
                                        border: "1px solid",
                                        borderColor: themeOptions.palette?.text?.disabled,
                                        borderRadius: "0.5vh",
                                        color: themeOptions.palette?.text?.primary,
                                        fontSize: "1.5vh",
                                        font: "Roboto",
                                        "&:hover": {
                                            backgroundColor: themeOptions.palette?.background?.default,
                                        },
                                    }}
                                    onClick={() => handleSolveProblemClick(row.problemName)}
                                >
                                    SOLVE PROBLEM
                                </Button>
                            </ProblemTableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}