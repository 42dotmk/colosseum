import { Execution } from "@/pages/CompetePage/types/Execution";
import ExecutionResult from "./ExecutionResult/ExecutionResult";
import SubmissionHeader from "./SubmissionHeader";
import SubmissionStatusBadge from "./SubmissionStatusBadge";
import { Submission } from "@/pages/CompetePage/types/Submission";

type SubmissionResultProps = {
  submission: Submission,
  subIndex: number,
  executionOverrides: Record<string, Execution[]>,
  isExecutionPassed: (exec: Execution) => boolean,
  submissionsLength: number,
  isInteractiveProblem: boolean
}

export default function SubmissionResult({
  submission, subIndex, executionOverrides, isExecutionPassed, submissionsLength,isInteractiveProblem
}: SubmissionResultProps) {

  const getSubmissionExecutions = (submission: Submission) =>
    executionOverrides[submission.documentId]?.length
      ? executionOverrides[submission.documentId]
      : (submission.executions || []);

  const sortExecutionsForDisplay = (executions: Execution[]) => {
    const rank = (execution: Execution) => {
      const hidden = !!execution.testCase?.hidden;
      const locked = !!execution.testCase?.locked;

      if (!hidden && !locked) return 0;
      if (!hidden && locked) return 1;
      if (hidden && !locked) return 2;
      return 3;
    };

    return [...executions].sort((left, right) => rank(left) - rank(right));
  };

  const executions = sortExecutionsForDisplay(
    getSubmissionExecutions(submission)
  );

  const hasUnprocessed = executions.some((exec: Execution) => !exec.processed);
  const hasQueueFailure = executions.some(
    (exec: Execution) =>
      typeof exec.stderr === 'string' &&
      exec.stderr.includes('Queue publish failed')
  );

  const passedCount = executions.filter((exec: Execution) =>
    isExecutionPassed(exec)
  ).length;

  return (
    <div key={submission.documentId} className="space-y-2">
      <div className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg">
        <SubmissionHeader 
          submissionsLength={submissionsLength} 
          subIndex={subIndex} 
          submission={submission} />

        <SubmissionStatusBadge
          executionsLength={executions.length}
          passedCount={passedCount}
          hasUnprocessed={hasUnprocessed}
          hasQueueFailure={hasQueueFailure} />
      </div>

      <div className="space-y-2 ml-3 pl-3 border-l">
        {executions.map((execution, index) => (
          <ExecutionResult 
            key={execution.documentId} 
            execution={execution}
            index={index}
            isInteractiveProblem={isInteractiveProblem} 
            isExecutionPassed={isExecutionPassed} />
        ))}
      </div>
    </div>
  );
}