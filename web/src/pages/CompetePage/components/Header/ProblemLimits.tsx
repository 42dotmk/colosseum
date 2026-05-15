import Language from "../../types/Language";
import { formatMemoryLimit, formatTimeLimit } from "./utils";

type ProblemLimitsProps = {
  timeLimit: number | undefined;
  memoryLimit: number | undefined;
}

export default function ProblemLimits({timeLimit, memoryLimit}: ProblemLimitsProps) {
  return (
    <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-1">
      <span>Time limit: {formatTimeLimit(timeLimit)}</span>
      <span>Memory limit: {formatMemoryLimit(memoryLimit)}</span>
    </div>
  )
}