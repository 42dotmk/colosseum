import { Submission } from "@/pages/CompetePage/types/Submission"

type SubmissionHeaderProps = {
  submission: Submission,
  subIndex: number,
  submissionsLength: number
}

export default function SubmissionHeader({
  submission, subIndex, submissionsLength
}: SubmissionHeaderProps) {
  return (
    <div>
      <p className="text-sm font-medium">
        #{submissionsLength - subIndex}
      </p>
      <p className="text-xs text-muted-foreground">
        {new Date(submission.createdAt).toLocaleTimeString()} •{' '}
        {submission.language?.name}
      </p>
    </div>
  )
}