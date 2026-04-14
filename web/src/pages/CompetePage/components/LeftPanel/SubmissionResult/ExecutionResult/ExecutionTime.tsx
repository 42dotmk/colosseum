import { Execution } from "@/pages/CompetePage/types/Execution"
import { Clock } from "lucide-react"

type ExecutionTimeProps = {
  execution: Execution
}

export default function ExecutionTime({
  execution
}: ExecutionTimeProps) {

   const formatExecutionTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return null;

    if (seconds >= 1) {
      return `${seconds.toFixed(3).replace(/\.?0+$/, '')}s`;
    }

    return `${Math.round(seconds * 1000)}ms`;
  };

  return (
    <>
      {execution.executionTime >= 0 && !execution.testCase?.locked && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
          <Clock className="h-3 w-3" />
          {formatExecutionTime(execution.executionTime)}
        </div>
      )}
    </>
  )
}