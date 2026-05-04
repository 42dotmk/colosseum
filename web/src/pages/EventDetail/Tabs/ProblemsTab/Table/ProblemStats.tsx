import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getDifficultyColor } from "@/pages/EventDetail/utils";
import { Circle } from "lucide-react";

type ProblemStats = {
  difficulty: string | undefined;
  points: number | undefined;
  problemStatusClass: string;
}


export default function ProblemStats({ difficulty, points, problemStatusClass}: ProblemStats) {
  return (
    <>
      <TableCell className="text-center">
        <span className={cn("text-sm font-medium", getDifficultyColor(difficulty))}>
          {difficulty || '—'}
        </span>
      </TableCell>
      <TableCell className="text-center font-mono">
        {points ?? "N/A"}
      </TableCell>
      <TableCell className="text-center">
        <Circle
          className={cn(
            'h-4 w-4 mx-auto',
            problemStatusClass,
          )}
        />
      </TableCell>
    </>
  )
}