import { Execution } from "@/pages/CompetePage/types/Execution";

export default function HiddenExecutionDetails({ execution }: { execution: Execution }) {
  return (
    <div className="text-xs text-muted-foreground italic">
      Execution details are hidden for{' '}
      {execution.testCase?.locked ? 'locked' : 'hidden'} tests.
    </div>
  )
}