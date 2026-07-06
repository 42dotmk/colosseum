import { Execution } from "@/pages/CompetePage/types/Execution";
import ExecutionResult from "./ExecutionResult/ExecutionResult";
import SubmissionHeader from "./SubmissionHeader";
import SubmissionStatusBadge from "./SubmissionStatusBadge";
import { Submission } from "@/pages/CompetePage/types/Submission";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import SyntaxHighlighterBase from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const SyntaxHighlighter = SyntaxHighlighterBase as any;

type SubmissionResultProps = {
  submission: Submission,
  subIndex: number,
  executionOverrides: Record<string, Execution[]>,
  isExecutionPassed: (exec: Execution) => boolean,
  submissionsLength: number,
  isInteractiveProblem: boolean
}

export default function SubmissionResult({
  submission,
  subIndex,
  executionOverrides,
  isExecutionPassed,
  submissionsLength,
  isInteractiveProblem
}: SubmissionResultProps) {
  const [showCode, setShowCode] = useState(true);
  const [showExecutionDetails, setShowExecutionDetails] = useState(false);

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
          submission={submission} 
          score={submission.score}
          maxScore={submission.maxScore}
          hasUnprocessed={hasUnprocessed}
          />

        <div className="flex items-center gap-2">
          <button onClick={() => setShowExecutionDetails(prev => !prev)}>
            {showExecutionDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <SubmissionStatusBadge
            executionsLength={executions.length}
            passedCount={passedCount}
            hasUnprocessed={hasUnprocessed}
            hasQueueFailure={hasQueueFailure}
          />
        </div>


      </div>

      {showExecutionDetails &&
        <div className="space-y-2 ml-3 pl-3 border-l">
          <div className="rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium">Code</span>

              <button onClick={() => setShowCode((prev) => !prev)}>
                {showCode
                  ? <ChevronUp className="h-4 w-4" />
                  : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showCode && (
              <SyntaxHighlighter
                language={submission.language.name.toLowerCase()}
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  background: "#0f172a",
                }}
                codeTagProps={{
                  style: {
                    background: "transparent",
                  },
                }}
              >
                {submission.code}
              </SyntaxHighlighter>
            )}
          </div>

          {executions.map((execution, index) => (
            <ExecutionResult
              key={execution.documentId}
              execution={execution}
              index={index}
              isInteractiveProblem={isInteractiveProblem}
              isExecutionPassed={isExecutionPassed} />
          ))}
        </div>
      }

    </div>
  );
}