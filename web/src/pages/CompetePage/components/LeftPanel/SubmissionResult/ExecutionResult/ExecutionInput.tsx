import { Execution } from "@/pages/CompetePage/types/Execution"

type ExecutionInputProps = {
  execution: Execution,
  isInteractiveProblem: boolean
}

export default function ExecutionInput({
  execution, isInteractiveProblem
}: ExecutionInputProps) {
  return (
    <>
      <div>
        <div className="text-xs text-muted-foreground mb-1">
          Input
        </div>
        <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
          {execution.testCase?.input}
        </pre>
      </div>

      {/* Here this feild may not always be needed, like if there are multiple solutions */}
      {!isInteractiveProblem && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Expected
          </div>
          <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
            {execution.testCase?.output}
          </pre>
        </div>
      )}
    </>
  )
}