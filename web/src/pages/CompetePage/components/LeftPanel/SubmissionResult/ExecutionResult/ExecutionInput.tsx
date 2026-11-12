import { Execution } from "@/pages/CompetePage/types/Execution"
import CopyButton from "../../../CopyButton";

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
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-muted-foreground">
            Input
          </div>
          <CopyButton value={execution.testCase?.input ?? ''} label="input" />
        </div>
        <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
          {execution.testCase?.input}
        </pre>
      </div>

      {/* Here this feild may not always be needed, like if there are multiple solutions */}
      {!isInteractiveProblem && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-muted-foreground">
              Expected
            </div>
            <CopyButton value={execution.testCase?.output ?? ''} label="expected output" />
          </div>
          <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
            {execution.testCase?.output}
          </pre>
        </div>
      )}
    </>
  )
}