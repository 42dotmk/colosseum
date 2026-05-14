import { Badge } from "@/components/ui/badge";
import { TableCell } from "@/components/ui/table";
import { Link } from "react-router-dom";

type ProblemNameProps = {
  isViewOnlyEvent: boolean;
  problemDocumentId: string;
  problemTitle: string;
  isInteractive: boolean | undefined;
  testCasesCount: number | undefined;
}

export default function ProblemName({isViewOnlyEvent, problemDocumentId, problemTitle, isInteractive, testCasesCount}: ProblemNameProps) {
  return (
    <TableCell>
      <Link
        to={isViewOnlyEvent ? `/compete/${problemDocumentId}?mode=view` : `/compete/${problemDocumentId}`}
        className="font-medium group-hover:text-primary transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {problemTitle}
      </Link>
      {isInteractive && (
        <Badge variant="secondary" className="ml-2 h-5 text-[10px]">
          Interactive
        </Badge>
      )}
      {testCasesCount && (
        <span className="text-xs text-muted-foreground ml-2">
          {testCasesCount} tests
        </span>
      )}
    </TableCell>
  )
}