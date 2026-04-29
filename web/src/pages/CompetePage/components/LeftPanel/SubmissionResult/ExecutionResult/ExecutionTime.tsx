import { Execution } from "@/pages/CompetePage/types/Execution"
import { Clock } from "lucide-react"
import { formatExecutionTime } from "./utils"

type ExecutionTimeProps = {
  execution: Execution
}

export default function ExecutionTime({ execution }: ExecutionTimeProps) {
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