import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

type ExecutionStatusIconProps = {
  isRunning: boolean;
  isPassed: boolean;
  isFailed: boolean;
}

export default function ExecutionStatusIcon({
  isRunning, isPassed, isFailed
}: ExecutionStatusIconProps) {
  return (
    <>
      {isRunning && (
        <Badge variant="secondary" className="gap-1 text-xs h-5">
          <Loader2 className="h-3 w-3 animate-spin" />
        </Badge>
      )}

      {isPassed && (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      )}

      {isFailed && (
        <XCircle className="h-4 w-4 text-destructive" />
      )}
    </>
  )
}