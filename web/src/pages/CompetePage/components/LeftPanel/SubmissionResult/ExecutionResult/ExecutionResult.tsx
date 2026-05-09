import { cn } from "@/lib/utils";
import ExecutionInput from "./ExecutionInput";
import ExecutionOutput from "./ExecutionOutput";
import ExecutionStatusIcon from "./ExecutionStatusIcon";
import ExecutionTime from "./ExecutionTime";
import HiddenExecutionDetails from "./HiddenExecutionDetails";
import InteractiveOutput from "./InteractiveOutput";
import { Execution } from "@/pages/CompetePage/types/Execution";

type ExecutionResultProps = {
  execution: Execution,
  index: number,
  isInteractiveProblem: boolean,
  isExecutionPassed: (exec: Execution) => boolean
}

export default function ExecutionResult({
  execution, index, isInteractiveProblem, isExecutionPassed
}: ExecutionResultProps) {

  const isPassed = isExecutionPassed(execution);
  const isFailed = execution.processed && !isPassed;
  const isRunning = !execution.processed;
  const detailsVisible =
    !execution.testCase?.hidden && !execution.testCase?.locked;

  

  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2",
        isPassed && "border-emerald-500/30",
        isFailed && "border-destructive/30"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">
          {execution.testCase?.hidden ? 'Hidden ' : ''}
          Test {index + 1}
        </span>

        <ExecutionStatusIcon 
          isRunning={isRunning} 
          isFailed={isFailed} 
          isPassed={isPassed}  />
      </div>

      {execution.processed && (
        <div className="space-y-2">
          {detailsVisible && 
          <ExecutionInput 
            isInteractiveProblem={isInteractiveProblem} 
            execution={execution} />}

          {detailsVisible ? (
            <>
              {isInteractiveProblem ? 
                <InteractiveOutput 
                  isFailed={isFailed}
                  isPassed={isPassed}
                  isInteractiveProblem={isInteractiveProblem}
                  execution={execution} />
                : 
                <ExecutionOutput 
                  isPassed={isPassed} 
                  isFailed={isFailed} 
                  execution={execution} />}
            </>
          ) :
            <HiddenExecutionDetails execution={execution} />
          }

          <ExecutionTime execution={execution} />
        </div>
      )}
    </div>
  );

}