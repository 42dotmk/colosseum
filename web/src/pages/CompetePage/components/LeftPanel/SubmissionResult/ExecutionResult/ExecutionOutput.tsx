import { cn } from "@/lib/utils"
import { Execution } from "@/pages/CompetePage/types/Execution"

type ExecutionOutputProps = {
  isPassed: boolean,
  isFailed: boolean,
  execution: Execution
}

export default function ExecutionOutput({
  isPassed, isFailed, execution
}: ExecutionOutputProps) {
  return (
    <>
      <div>
        <div className="text-xs text-muted-foreground mb-1">
          Output
        </div>
        <pre
          className={cn(
            "text-xs p-2 rounded font-mono overflow-x-auto",
            isPassed
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {execution.stdout || '(empty)'}
        </pre>
      </div>

      {execution.stderr && isFailed && (
        <div>
          <div className="text-xs text-destructive mb-1">
            Error
          </div>
          <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded font-mono overflow-x-auto">
            {execution.stderr}
          </pre>
        </div>
      )}
    </>
  )
}