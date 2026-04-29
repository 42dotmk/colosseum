import Language from "../../types/Language";
import { formatMemoryLimit, formatTimeLimit } from "./utils";

export default function ProblemLimits({selectedLanguageObject}: {selectedLanguageObject: Language | undefined}) {
  return (
    <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-1">
      <span>Time limit: {formatTimeLimit(selectedLanguageObject?.defaultMaxCpuTime)}</span>
      <span>Memory limit: {formatMemoryLimit(selectedLanguageObject?.defaultMaxMemory)}</span>
    </div>
  )
}