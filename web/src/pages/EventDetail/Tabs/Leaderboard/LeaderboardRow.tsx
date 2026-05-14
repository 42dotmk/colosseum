import { TableCell, TableRow } from "@/components/ui/table";

type LeaderboardRowProps = {
  row: {
    rank: number;
    user: {
      displayName: string;
    };
    solvedCount: number;
    totalScore: number;
    totalTime: number;
  };
}

export default function LeaderboardRow({ row }: LeaderboardRowProps) {
  return (
    <TableRow>
      <TableCell className="text-center font-mono">{row.rank}</TableCell>
      <TableCell className="font-medium">{row.user.displayName}</TableCell>
      <TableCell className="text-center font-mono">{row.solvedCount}</TableCell>
      <TableCell className="text-center font-mono">{row.totalScore.toFixed(2)}</TableCell>
      <TableCell className="text-center font-mono">{row.totalTime.toFixed(2)}</TableCell>
    </TableRow>
  )
}