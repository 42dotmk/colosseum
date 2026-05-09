import { cn } from "@/lib/utils"
import { Execution } from "@/pages/CompetePage/types/Execution";

type InteractiveOutputProps = {
  isFailed: boolean,
  isPassed: boolean,
  execution: Execution,
  isInteractiveProblem: boolean
}

export default function InteractiveOutput({
  isFailed, isPassed,execution,isInteractiveProblem
}: InteractiveOutputProps) {

  const parseInteractiveStderr = (stderr: string) => {
    const source = stderr || '';
    const participantMatch = source.match(
      /=== PARTICIPANT_OUTPUT ===\n([\s\S]*?)(?=\n=== (?:INTERACTOR_MESSAGE|INTERACTOR_STREAM) ===|$)/
    );
    const interactorMatch = source.match(
      /=== INTERACTOR_MESSAGE ===\n([\s\S]*?)(?=\n=== INTERACTOR_STREAM ===|$)/
    );
    const interactorStreamMatch = source.match(
      /=== INTERACTOR_STREAM ===\n([\s\S]*)$/
    );

    const participantOutput = participantMatch?.[1]?.trim() || '';
    const interactorMessage = interactorMatch?.[1]?.trim() || '';
    const interactorStream = interactorStreamMatch?.[1]?.trim() || '';

    const cleaned = source
      .replace(
        /\n?=== PARTICIPANT_OUTPUT ===\n[\s\S]*?(?=\n=== (?:INTERACTOR_MESSAGE|INTERACTOR_STREAM) ===|$)/,
        ''
      )
      .replace(
        /\n?=== INTERACTOR_MESSAGE ===\n[\s\S]*?(?=\n=== INTERACTOR_STREAM ===|$)/,
        ''
      )
      .replace(/\n?=== INTERACTOR_STREAM ===\n[\s\S]*$/, '')
      .trim();

    return {
      participantOutput,
      interactorMessage,
      interactorStream,
      fallback: cleaned,
    };
  };

  const getInteractorDisplay = (stream: string, message: string, inputText: string) => {
    const streamLines = (stream || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const firstInputLine = (inputText || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    const firstInputToken = (inputText || '')
      .trim()
      .split(/\s+/)
      .find(Boolean);

    const normalizedStream = [...streamLines];

    if (
      normalizedStream.length > 0 &&
      ((firstInputLine && normalizedStream[0] === firstInputLine) ||
        (firstInputToken && normalizedStream[0] === firstInputToken))
    ) {
      normalizedStream.shift();
    }

    const combined = [
      normalizedStream.join('\n').trim(),
      (message || '').trim(),
    ].filter(Boolean);

    return combined.join('\n\n').trim();
  };

  const interactiveDetails = isInteractiveProblem
    ? parseInteractiveStderr(execution.stderr || '')
    : null;

  const interactorDisplay = isInteractiveProblem
    ? getInteractorDisplay(
      interactiveDetails?.interactorStream || '',
      interactiveDetails?.interactorMessage || '',
      execution.testCase?.input || ''
    )
    : '';


  return (
    <>
      <div>
        <div className="text-xs text-muted-foreground mb-1">
          Your Output
        </div>
        <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
          {interactiveDetails?.participantOutput || '(empty)'}
        </pre>
      </div>

      {(interactorDisplay ||
        (isFailed &&
          (interactiveDetails?.fallback || execution.stderr))) && (
          <div>
            <div
              className={cn(
                "text-xs mb-1",
                isPassed
                  ? "text-muted-foreground"
                  : "text-destructive"
              )}
            >
              Interactor
            </div>
            <pre
              className={cn(
                "text-xs p-2 rounded font-mono overflow-x-auto",
                isPassed
                  ? "bg-muted text-foreground"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {interactorDisplay ||
                interactiveDetails?.fallback ||
                execution.stderr}
            </pre>
          </div>
        )}

      <div>
        <div className="text-xs text-muted-foreground mb-1">
          Verdict
        </div>
        <pre
          className={cn(
            "text-xs p-2 rounded font-mono overflow-x-auto",
            isPassed
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-destructive/10 text-destructive"
          )}
        >
          {execution.stdout || '(empty)'}
        </pre>
      </div>
    </>
  )
}