import { TableCell, TableRow } from "@/components/ui/table";
import { Problem } from "@/pages/EventDetail/types"
import { ChevronRight } from "lucide-react";
import ProblemName from "./ProblemName";
import ProblemStats from "./ProblemStats";

type TableRowProps = {
  problem: Problem,
  index: number,
  isRegisteredForEvent: boolean;
  isViewOnlyEvent: boolean;
  problemStatusClass: string;
}

export default function TableRowComponent({ problem, index, isRegisteredForEvent, isViewOnlyEvent, problemStatusClass }: TableRowProps) {
  function handleRowClick() {
    if (!isRegisteredForEvent && !isViewOnlyEvent) {
      return;
    }
    window.location.href = isViewOnlyEvent
      ? `/compete/${problem.documentId}?mode=view`
      : `/compete/${problem.documentId}`;
  }

  return (
    <TableRow
      key={problem.documentId}
      className="group cursor-pointer"
      onClick={() => handleRowClick()}
    >
      <TableCell className="text-center font-mono text-muted-foreground">
        {index + 1}
      </TableCell>

      <ProblemName
        isViewOnlyEvent={isViewOnlyEvent}
        isInteractive={problem.isInteractive}
        problemDocumentId={problem.documentId}
        problemTitle={problem.title}
        testCasesCount={problem.testCases?.length} />
      <ProblemStats
        points={problem.points}
        difficulty={problem.difficulty}
        problemStatusClass={problemStatusClass}
        lastSubmission={problem.lastSubmission} />
      <TableCell>
        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
      </TableCell>
    </TableRow>
  )
}