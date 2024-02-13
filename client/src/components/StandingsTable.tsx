import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import themeOptions from '../theme';

const StandingsTableCell = styled(TableCell)(() => ({
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

function createProblemsData(
participantName: string,
points: number[],
) {
    return { participantName, points };
}

function createProblemNames(
    problemName: string[],
) {
    return { problemName };
}

const problemNames = [
    createProblemNames(['Project Euler #1', 'Project Euler #2', 'Project Euler #3', 'Project Euler #4']),
    // createProblemNames
];

const rows = [
    createProblemsData('Name Surname', [100, 200, 400, 500, 1200]),
    createProblemsData('Name Surname', [100, 100, 100, 100, 400]),
    createProblemsData('Name Surname', [0, 0, 0, 0, 0]),
    createProblemsData('Name Surname', [0, 0, 0, 0, 0]),
    createProblemsData('Name Surname', [0, 0, 0, 0, 0]),
];

export default function StandingsTable() {
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
                aria-label="standings table"
            >
                <TableHead>
                    <TableRow>
                        <StandingsTableCell>
                            PARTICIPANTS
                        </StandingsTableCell>
                        {problemNames.map((element) => (
                            element.problemName.map((name) => (
                                <StandingsTableCell scope="row">
                                    {name}
                                </StandingsTableCell>
                            )
                        )))}
                        <StandingsTableCell>
                            TOTAL
                        </StandingsTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <TableRow 
                            key={row.participantName}
                        >
                            <StandingsTableCell 
                                scope="row"
                            >
                                {row.participantName}
                            </StandingsTableCell>
                            {row.points.map((point) => (
                                <StandingsTableCell 
                                    scope="row"
                                >
                                    {point}
                                </StandingsTableCell>
                            )
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}