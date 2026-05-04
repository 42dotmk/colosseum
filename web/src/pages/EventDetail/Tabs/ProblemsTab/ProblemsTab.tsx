import { Table, TableBody } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import NotRegistered from "./NotRegistered";
import NoProblems from "./NoProblems";
import TableHeaderComponent from "./Table/TableHeader";
import TableRowComponent from "./Table/TableRow";
import { Problem, ProblemStatus, ProblemSubmission, SubmissionExecution } from "../../types";
import { useEffect, useState } from "react";
import { REST_URL } from "@/config";

type ProblemsTabProps = {
  isRegisteredForEvent: boolean;
  isViewOnlyEvent: boolean;
  visibleProblems: Problem[];
  eventId: string | undefined;
  isEnded: boolean;
  isUpcoming: boolean;
}

export default function ProblemsTab({ isRegisteredForEvent, isViewOnlyEvent, visibleProblems, eventId, isEnded, isUpcoming }: ProblemsTabProps) {
  const [problemStatusById, setProblemStatusById] = useState<Record<string, ProblemStatus>>({});

  const isExecutionPassed = (execution: SubmissionExecution) => {
    if (!execution?.processed) {
      return false;
    }

    if (typeof execution.passed === 'boolean') {
      return execution.passed;
    }

    return (execution.stdout || '').trim() === (execution.testCase?.output || '').trim();
  };

  useEffect(() => {
    if (!eventId || !event || !isRegisteredForEvent) {
      setProblemStatusById({});
      return;
    }

    const fetchProblemStatuses = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(
          `${REST_URL}/submissions?filters[event][documentId][$eq]=${eventId}&populate[problem][fields][0]=documentId&populate[problem][fields][1]=leaderboardVisibilityMode&populate[executions][fields][0]=processed&populate[executions][fields][1]=passed&populate[executions][fields][2]=stdout&populate[executions][populate][testCase][fields][0]=output&populate[executions][populate][testCase][fields][1]=hidden&populate[executions][populate][testCase][fields][2]=locked&sort=createdAt:desc`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : '',
            },
          },
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const submissions = (Array.isArray(data) ? data : (data.data || [])) as ProblemSubmission[];

        const latestByProblem = new Map<string, ProblemSubmission>();
        for (const submission of submissions) {
          const problemDocumentId = submission.problem?.documentId;
          if (!problemDocumentId || latestByProblem.has(problemDocumentId)) {
            continue;
          }

          latestByProblem.set(problemDocumentId, submission);
        }

        const nextStatusById: Record<string, ProblemStatus> = {};

        for (const problem of visibleProblems || []) {
          const latestSubmission = latestByProblem.get(problem.documentId);
          if (!latestSubmission) {
            nextStatusById[problem.documentId] = 'not_tried';
            continue;
          }

          const mode = problem.leaderboardVisibilityMode || 'public_only_live';
          const shouldUseInLiveStatus = (testCase?: { hidden?: boolean; locked?: boolean }) => {
            // Some interactive execution payloads can miss testCase relation in this
            // endpoint. Treat them as visible fallback so solved statuses are counted.
            if (!testCase) {
              return true;
            }

            if (isEnded || mode === 'full_live') {
              return true;
            }

            return !testCase.hidden && !testCase.locked;
          };

          const scopedCountFromProblem = (problem.testCases || []).filter((testCase: any) =>
            shouldUseInLiveStatus(testCase)
          ).length;
          const scopedExecutionResults = (latestSubmission.executions || []).filter(
            (execution) => shouldUseInLiveStatus(execution.testCase),
          );

          const visibleCount = scopedCountFromProblem || scopedExecutionResults.length;
          const passedCount = scopedExecutionResults.filter((execution) => isExecutionPassed(execution)).length;

          if (visibleCount <= 0) {
            nextStatusById[problem.documentId] = 'zero';
          } else if (passedCount <= 0) {
            nextStatusById[problem.documentId] = 'zero';
          } else if (passedCount >= visibleCount) {
            nextStatusById[problem.documentId] = 'full';
          } else {
            nextStatusById[problem.documentId] = 'partial';
          }
        }

        setProblemStatusById(nextStatusById);
      } catch (err) {
        console.error('Failed to load problem statuses:', err);
      }
    };

    fetchProblemStatuses();
  }, [eventId, event, isRegisteredForEvent]);

  const getProblemStatusClass = (status: ProblemStatus | undefined) => {
    switch (status) {
      case 'zero':
        return 'text-red-500 fill-current';
      case 'partial':
        return 'text-amber-500 fill-current';
      case 'full':
        return 'text-emerald-500 fill-current';
      default:
        return 'text-muted-foreground/30 fill-transparent';
    }
  };

  return (
    <TabsContent value="problems" className="mt-0">
      {!isRegisteredForEvent && !isViewOnlyEvent ? (
        <NotRegistered />
      ) : visibleProblems.length === 0 ? (
        <NoProblems isUpcoming={isUpcoming} />
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeaderComponent />
            <TableBody>
              {visibleProblems.map((problem, index) => (
                <TableRowComponent
                  key={problem.documentId}
                  problem={problem}
                  index={index}
                  isRegisteredForEvent={isRegisteredForEvent}
                  isViewOnlyEvent={isViewOnlyEvent}
                  problemStatusClass={getProblemStatusClass(problemStatusById[problem.documentId])} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </TabsContent>
  )
}