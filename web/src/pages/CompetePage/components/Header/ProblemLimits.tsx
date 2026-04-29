import Language from "../../types/Language";
<<<<<<< HEAD
<<<<<<< HEAD
import { formatMemoryLimit, formatTimeLimit } from "./utils";

export default function ProblemLimits({selectedLanguageObject}: {selectedLanguageObject: Language | undefined}) {
  return (
    <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-1">
      <span>Time limit: {formatTimeLimit(selectedLanguageObject?.defaultMaxCpuTime)}</span>
      <span>Memory limit: {formatMemoryLimit(selectedLanguageObject?.defaultMaxMemory)}</span>
    </div>
=======
=======
import { formatMemoryLimit, formatTimeLimit } from "./utils";
>>>>>>> cfe1066 (fixed some of the comments)

export default function ProblemLimits({selectedLanguageObject}: {selectedLanguageObject: Language | undefined}) {
  return (
<<<<<<< HEAD
    <>
      <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-1">
        <span>Time limit: {formatTimeLimit(selectedLanguageObject?.defaultMaxCpuTime)}</span>
        <span>Memory limit: {formatMemoryLimit(selectedLanguageObject?.defaultMaxMemory)}</span>
      </div>
    </>
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
=======
    <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-1">
      <span>Time limit: {formatTimeLimit(selectedLanguageObject?.defaultMaxCpuTime)}</span>
      <span>Memory limit: {formatMemoryLimit(selectedLanguageObject?.defaultMaxMemory)}</span>
    </div>
>>>>>>> cfe1066 (fixed some of the comments)
  )
}