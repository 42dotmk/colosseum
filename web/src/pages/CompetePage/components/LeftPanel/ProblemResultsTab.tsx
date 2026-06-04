import { TabsContent } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { Execution } from "../../types/Execution";
import { Submission } from "../../types/Submission";
import SubmissionResult from "./SubmissionResult/SubmissionResult";

type ProblemResultsTabProps = {
  submissions: Submission[],
  executionOverrides: Record<string, Execution[]>,
  isExecutionPassed: (exec: Execution) => boolean,
  isInteractiveProblem: boolean
}

export default function ProblemResultsTab({
  submissions,executionOverrides,isExecutionPassed,isInteractiveProblem
}: ProblemResultsTabProps) {

  return (
    <>
      <TabsContent value="results" className="mt-0 h-full">
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No submissions yet</p>
            </div>
          ) : (
            submissions.map((submission, subIndex) => (
              <SubmissionResult 
                submission={submission} 
                subIndex={subIndex}
                submissionsLength={submissions.length}
                executionOverrides={executionOverrides}
                isExecutionPassed={isExecutionPassed}
                isInteractiveProblem={isInteractiveProblem} />
            ))
          )}
        </div>
      </TabsContent>
    </>
  )
}