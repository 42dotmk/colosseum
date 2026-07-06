import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

type SubmissionStatusBadgeProps = {
  executionsLength: number,
  passedCount: number,
  hasUnprocessed: boolean,
  hasQueueFailure: boolean
}

export default function SubmissionStatusBadge({
  executionsLength, passedCount, hasUnprocessed, hasQueueFailure
}: SubmissionStatusBadgeProps) {
  return (
    <>
      {hasUnprocessed ? (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </Badge>
      ) 
      : hasQueueFailure ? (
        <Badge variant="destructive" className="text-xs">
          Queue unavailable
        </Badge>
      ) 
      : (
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            passedCount === executionsLength
              ? "border-emerald-500/50 text-emerald-500"
              : passedCount<=0 ? "border-destructive/50 text-destructive" : "border-amber-500/50 text-amber-500"
          )}
        >
          {passedCount}/{executionsLength}
        </Badge>
      )}
    </>
  )
}