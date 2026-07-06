import { Submission } from "@/pages/CompetePage/types/Submission"
import { cn } from "@/lib/utils"

type SubmissionHeaderProps = {
  submission: Submission,
  subIndex: number,
  submissionsLength: number,
  score: number,
  maxScore: number,
  hasUnprocessed: boolean
}

export default function SubmissionHeader({
  submission, subIndex, submissionsLength, score, maxScore, hasUnprocessed
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
      {hasUnprocessed ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Evaluating
          </span>

          <div className="flex items-center gap-1 relative -bottom-1">
            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" />
            <div
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: '0.1s' }}
            />
            <div
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
        </div>
      ) : (
        <p className={cn("text-base font-semibold", score === maxScore ? "text-emerald-500" : score<=0 ? "text-red-500" : "text-amber-500")}>Score: {score} / {maxScore} pts</p>
      )}
    </div>
  )
}