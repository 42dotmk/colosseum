import { Card } from "@/components/ui/card";
<<<<<<< HEAD
import { Tabs } from "@/components/ui/tabs";
=======
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Markdown from "@/components/Markdown";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
import TrainingNavigation from "../ProblemNavigationButtons/TrainingNavigation";

import type { Submission } from "../../types/Submission";
import type { Execution } from "../../types/Execution";
import type { TestCase } from "../../types/TestCase";
import type { Problem } from "../../types/Problem";
import type { EventProblem } from "../../types/EventProblem";

import { useEffect } from "react";
<<<<<<< HEAD
import TabsListComponent from "./TabsListComponent";
import ProblemTab from "./ProblemTab";
import TestCasesTab from "./TestCasesTab";
import ProblemResultsTab from "./ProblemResultsTab";

type LeftPanelProps = {
  isViewMode: boolean;
=======

type LeftPanelProps = {
  isViewMode: boolean;
  problemDescription: string;
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
  isInteractiveProblem: boolean;
  problem: Problem | null;

  activeTab: 'description' | 'testcases' | 'results';
  setActiveTab: React.Dispatch<
    React.SetStateAction<'description' | 'testcases' | 'results'>
  >;

  submissions: Submission[];
  executionOverrides: Record<string, Execution[]>;
  isExecutionPassed: (exec: Execution) => boolean;

  isTrainingMode: boolean;
  previousProblem: EventProblem | null;
  nextProblem: EventProblem | null;
};

export default function LeftPanel({
  isViewMode,
<<<<<<< HEAD
=======
  problemDescription,
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
  isInteractiveProblem,
  problem,
  activeTab,
  setActiveTab,
  submissions,
  executionOverrides,
  isExecutionPassed,
  isTrainingMode,
  previousProblem,
  nextProblem,
}: LeftPanelProps) {
<<<<<<< HEAD
=======
  const getSubmissionExecutions = (submission: Submission) =>
    executionOverrides[submission.documentId]?.length
      ? executionOverrides[submission.documentId]
      : (submission.executions || []);

  const sortExecutionsForDisplay = (executions: Execution[]) => {
    const rank = (execution: Execution) => {
      const hidden = !!execution.testCase?.hidden;
      const locked = !!execution.testCase?.locked;

      if (!hidden && !locked) return 0;
      if (!hidden && locked) return 1;
      if (hidden && !locked) return 2;
      return 3;
    };

    return [...executions].sort((left, right) => rank(left) - rank(right));
  };

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

  const formatExecutionTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return null;

    if (seconds >= 1) {
      return `${seconds.toFixed(3).replace(/\.?0+$/, '')}s`;
    }

    return `${Math.round(seconds * 1000)}ms`;
  };
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)

  const testCases = problem?.testCases || [];
  const publicTestCases = testCases.filter((tc: TestCase) => !tc.hidden && !tc.locked);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();

        const tabMap: Record<string, 'description' | 'testcases' | 'results'> = {
          '1': 'description',
          '2': 'testcases',
          '3': 'results',
        };

        if (tabMap[e.key] === 'results' && isViewMode) {
          return;
        }

        setActiveTab(tabMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isViewMode, setActiveTab]);

  return (
    <Card className="flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'description' | 'testcases' | 'results')} className="flex flex-col h-full">
<<<<<<< HEAD
        <TabsListComponent 
          isViewMode={isViewMode} 
          submissions={submissions} />

        <div className="flex-1 overflow-auto p-4">
          <ProblemTab 
            problemDescription={problem?.description} 
            testCasesLength={testCases.length} 
            publicTestCasesLength={publicTestCases.length} />

          <TestCasesTab publicTestCases={publicTestCases} />

          {!isViewMode && 
          <ProblemResultsTab 
            submissions={submissions} 
            executionOverrides={executionOverrides} 
            isExecutionPassed={isExecutionPassed} 
            isInteractiveProblem={isInteractiveProblem} />}
        </div>
      </Tabs>

      {isTrainingMode && 
=======
        <div className="border-b px-4 py-2">
          <TabsList className="h-8">
            <TabsTrigger value="description" className="text-xs px-3 h-7">
              Problem
            </TabsTrigger>

            <TabsTrigger value="testcases" className="text-xs px-3 h-7">
              Tests
            </TabsTrigger>

            {!isViewMode && (
              <TabsTrigger value="results" className="text-xs px-3 h-7">
                Results
                {submissions.length > 0 && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({submissions.length})
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <TabsContent value="description" className="mt-0 h-full">
            <div className="space-y-4">
              <div className="prose prose-sm prose-invert max-w-none">
                <Markdown content={problemDescription || ''} />
              </div>

              <Separator />

              <div className="text-xs text-muted-foreground">
                {testCases.length} test cases ({publicTestCases.length} visible)
              </div>
            </div>
          </TabsContent>

          <TabsContent value="testcases" className="mt-0 h-full">
            <div className="space-y-3">
              {publicTestCases.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No public test cases available
                </p>
              ) : (
                publicTestCases.map((tc: TestCase, index: number) => (
                  <div key={tc.documentId} className="rounded-lg border p-3 space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Test {index + 1}
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Input</div>
                      <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                        {tc.input}
                      </pre>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Expected</div>
                      <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                        {tc.output}
                      </pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {!isViewMode && (
            <TabsContent value="results" className="mt-0 h-full">
              <div className="space-y-4">
                {submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No submissions yet</p>
                  </div>
                ) : (
                  submissions.map((submission, subIndex) => {
                    const executions = sortExecutionsForDisplay(
                      getSubmissionExecutions(submission)
                    );

                    const hasUnprocessed = executions.some((exec) => !exec.processed);
                    const hasQueueFailure = executions.some(
                      (exec: Execution) =>
                        typeof exec.stderr === 'string' &&
                        exec.stderr.includes('Queue publish failed')
                    );

                    const passedCount = executions.filter((exec: Execution) =>
                      isExecutionPassed(exec)
                    ).length;

                    return (
                      <div key={submission.documentId} className="space-y-2">
                        <div className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">
                              #{submissions.length - subIndex}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(submission.createdAt).toLocaleTimeString()} •{' '}
                              {submission.language?.name}
                            </p>
                          </div>

                          <div>
                            {hasUnprocessed ? (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Running
                              </Badge>
                            ) : hasQueueFailure ? (
                              <Badge variant="destructive" className="text-xs">
                                Queue unavailable
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  passedCount === executions.length
                                    ? "border-emerald-500/50 text-emerald-500"
                                    : "border-destructive/50 text-destructive"
                                )}
                              >
                                {passedCount}/{executions.length}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 ml-3 pl-3 border-l">
                          {executions.map((execution, index) => {
                            const isPassed = isExecutionPassed(execution);
                            const isFailed = execution.processed && !isPassed;
                            const isRunning = !execution.processed;
                            const detailsVisible =
                              !execution.testCase?.hidden && !execution.testCase?.locked;

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
                              <div
                                key={execution.documentId}
                                className={cn(
                                  "rounded-lg border p-3 space-y-2",
                                  isPassed && "border-emerald-500/30",
                                  isFailed && "border-destructive/30"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium">
                                    {execution.testCase?.hidden ? 'Hidden ' : ''}
                                    Test {index + 1}
                                  </span>

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
                                </div>

                                {execution.processed && (
                                  <div className="space-y-2">
                                    {detailsVisible && (
                                      <>
                                        <div>
                                          <div className="text-xs text-muted-foreground mb-1">
                                            Input
                                          </div>
                                          <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                                            {execution.testCase?.input}
                                          </pre>
                                        </div>

                                        {!isInteractiveProblem && (
                                          <div>
                                            <div className="text-xs text-muted-foreground mb-1">
                                              Expected
                                            </div>
                                            <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                                              {execution.testCase?.output}
                                            </pre>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {detailsVisible ? (
                                      <>
                                        {isInteractiveProblem ? (
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
                                        ) : (
                                          <>
                                            <div>
                                              <div className="text-xs text-muted-foreground mb-1">
                                                Output
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

                                            {execution.stderr && isFailed && (
                                              <div>
                                                <div className="text-xs text-destructive mb-1">
                                                  Error
                                                </div>
                                                <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded font-mono overflow-x-auto">
                                                  {execution.stderr}
                                                </pre>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-xs text-muted-foreground italic">
                                        Execution details are hidden for{' '}
                                        {execution.testCase?.locked ? 'locked' : 'hidden'} tests.
                                      </div>
                                    )}

                                    {execution.executionTime >= 0 && !execution.testCase?.locked && (
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                                        <Clock className="h-3 w-3" />
                                        {formatExecutionTime(execution.executionTime)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>

      {isTrainingMode && (
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
        <TrainingNavigation
          previousProblem={previousProblem}
          nextProblem={nextProblem}
        />
<<<<<<< HEAD
      }
=======
      )}
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
    </Card>
  );
}