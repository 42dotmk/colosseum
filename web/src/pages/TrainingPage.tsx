import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { REST_URL } from '@/config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventProblem {
  documentId: string;
  title: string;
  points?: number;
  difficulty?: string;
}

interface EventItem {
  documentId: string;
  title: string;
  end: string;
  problems?: EventProblem[];
}

interface SubmissionExecution {
  processed: boolean;
  passed?: boolean;
  stdout?: string;
  testCase?: {
    output?: string;
    hidden?: boolean;
    locked?: boolean;
  };
}

interface TrainingSubmission {
  documentId: string;
  createdAt: string;
  metadata?: {
    mode?: string;
  };
  problem?: {
    documentId: string;
  };
  executions?: SubmissionExecution[];
}

type ProblemStatus = 'not_tried' | 'zero' | 'partial' | 'full';

export default function TrainingPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchPastEvents = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(
          `${REST_URL}/events?fields[0]=documentId&fields[1]=title&fields[2]=end&populate[problems][fields][0]=documentId&populate[problems][fields][1]=title&populate[problems][fields][2]=points&sort=end:desc`,
          {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const allEvents = Array.isArray(data) ? data : (data.data || []);
        setEvents(allEvents);
      } catch (err) {
        console.error('Failed to load training problems:', err);
        setError('Failed to load training problems');
      } finally {
        setLoading(false);
      }
    };

    fetchPastEvents();
  }, []);

  const pastProblems = useMemo(() => {
    const now = Date.now();

    return (events || [])
      .filter((event) => {
        const endMs = new Date(event.end).getTime();
        return !Number.isNaN(endMs) && endMs < now;
      })
      .flatMap((event) =>
        (event.problems || []).map((problem) => ({
          ...problem,
          eventId: event.documentId,
          eventTitle: event.title,
          eventEnd: event.end,
        })),
      );
  }, [events]);
  
  useEffect(() => {
    const fetchStatuses = async () => {
      const uniqueProblemIds = Array.from(new Set(pastProblems.map((problem) => problem.documentId)));
      if (uniqueProblemIds.length === 0) {
        setProblemStatusById({});
        return;
      }

      try {
        const token = localStorage.getItem('jwt');
        const params = new URLSearchParams();

        uniqueProblemIds.forEach((id, index) => {
          params.append(`filters[problem][documentId][$in][${index}]`, id);
        });

        params.append('populate[problem][fields][0]', 'documentId');
        params.append('populate[executions][fields][0]', 'processed');
        params.append('populate[executions][fields][1]', 'passed');
        params.append('populate[executions][fields][2]', 'stdout');
        params.append('populate[executions][populate][testCase][fields][0]', 'output');
        params.append('populate[executions][populate][testCase][fields][1]', 'hidden');
        params.append('populate[executions][populate][testCase][fields][2]', 'locked');
        params.append('sort', 'createdAt:desc');

        const response = await fetch(`${REST_URL}/submissions?${params.toString()}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          setProblemStatusById({});
          return;
        }

        const data = await response.json();
        const submissions = (Array.isArray(data) ? data : (data.data || [])) as TrainingSubmission[];
        const practiceSubmissions = submissions.filter((submission) => submission?.metadata?.mode === 'practice');

        const latestByProblem = new Map<string, TrainingSubmission>();
        for (const submission of practiceSubmissions) {
          const problemId = submission.problem?.documentId;
          if (!problemId || latestByProblem.has(problemId)) {
            continue;
          }

          latestByProblem.set(problemId, submission);
        }

        const nextStatuses: Record<string, ProblemStatus> = {};
        uniqueProblemIds.forEach((problemId) => {
          const latest = latestByProblem.get(problemId);
          if (!latest) {
            nextStatuses[problemId] = 'not_tried';
            return;
          }

          const visibleExecutions = (latest.executions || []).filter(
            (execution) => execution.testCase && !execution.testCase.hidden && !execution.testCase.locked,
          );

          const visibleCount = visibleExecutions.length;
          const passedCount = visibleExecutions.filter((execution) => isExecutionPassed(execution)).length;

          if (visibleCount <= 0 || passedCount <= 0) {
            nextStatuses[problemId] = 'zero';
          } else if (passedCount >= visibleCount) {
            nextStatuses[problemId] = 'full';
          } else {
            nextStatuses[problemId] = 'partial';
          }
        });

        setProblemStatusById(nextStatuses);
      } catch (err) {
        console.error('Failed to load training statuses:', err);
        setProblemStatusById({});
      }
    };

    fetchStatuses();
  }, [pastProblems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Training</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Practice with problems from past events in training mode.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/training/leaderboard">View leaderboard</Link>
          </Button>
        </div>
      </div>

      {pastProblems.length === 0 ? (
        <div className="text-center py-16 border rounded-lg text-muted-foreground text-sm">
          No past-event problems available yet.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Problem</TableHead>
                <TableHead>Event</TableHead>
                <TableHead className="w-24 text-center">Points</TableHead>
                <TableHead className="w-32">Difficulty</TableHead>
                <TableHead className="w-20 text-center">Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastProblems.map((item) => (
                <TableRow
                  key={`${item.eventId}-${item.documentId}`}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/compete/${item.documentId}?mode=training`)}
                >
                  <TableCell>
                    <span className="font-medium group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </TableCell>
                  <TableCell>{item.eventTitle}</TableCell>
                  <TableCell className="text-center font-mono">{item.points ?? '—'}</TableCell>
                  <TableCell>
                    {item.difficulty ? (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                        {item.difficulty}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Circle
                      className={cn(
                        'h-4 w-4 mx-auto',
                        getProblemStatusClass(problemStatusById[item.documentId]),
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
