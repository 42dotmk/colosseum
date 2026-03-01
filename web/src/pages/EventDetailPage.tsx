import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Circle, ChevronRight, FileText, Trophy } from 'lucide-react';
import { REST_URL } from '@/config';
import Markdown from '@/components/Markdown';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface Problem {
  documentId: string;
  title: string;
  description: string;
  slug: string;
  difficulty?: string;
  points: number;
  leaderboardVisibilityMode?: 'public_only_live' | 'full_live';
  testCases?: any[];
}

interface Event {
  title: string;
  description: string;
  start: string;
  end: string;
  problems?: Problem[];
  supportedLanguages?: any[];
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

interface ProblemSubmission {
  documentId: string;
  createdAt: string;
  problem?: {
    documentId: string;
    leaderboardVisibilityMode?: 'public_only_live' | 'full_live';
  };
  executions?: SubmissionExecution[];
}

type ProblemStatus = 'not_tried' | 'zero' | 'partial' | 'full';

interface LeaderboardProblem {
  documentId: string;
  title?: string;
  points: number;
  leaderboardVisibilityMode: 'public_only_live' | 'full_live';
}

interface LeaderboardRow {
  rank: number;
  user: {
    documentId: string;
    username?: string;
    email?: string;
    displayName: string;
  };
  totalScore: number;
  solvedCount: number;
  totalTime: number;
}

interface LeaderboardResponse {
  event: {
    documentId: string;
    title: string;
    start?: string;
    end?: string;
    eventStarted?: boolean;
    eventEnded: boolean;
  };
  totals: {
    maxPoints: number;
    scoredCap: number;
  };
  leaderboardAvailable?: boolean;
  problems: LeaderboardProblem[];
  leaderboard: LeaderboardRow[];
}

interface RegistrationStatus {
  eventId: string;
  registrationMode: 'open' | 'invite_only';
  allowPostStartRegistration: boolean;
  registrationOpen: boolean;
  isEligible: boolean;
  isRegistered: boolean;
  canRegister: boolean;
}

interface EventQuestion {
  documentId: string;
  question: string;
  answer: string;
  answeredAt?: string;
  answeredBy?: {
    documentId?: string;
    displayName?: string;
  };
}

function getTimeRemaining(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return '0:00:00';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getDifficultyColor(difficulty?: string) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'text-emerald-500';
    case 'medium': return 'text-amber-500';
    case 'hard': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
}

export default function EventDetailPage() {
  const { eventId } = useParams();
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('problems');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [problemStatusById, setProblemStatusById] = useState<Record<string, ProblemStatus>>({});
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState('');
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

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
    const fetchEvent = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events/${eventId}?populate=*`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const eventData = data.data || data;
        setEvent(eventData);
      } catch (err) {
        console.error('Failed to load event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  // Timer effect
  useEffect(() => {
    if (!event) return;
    
    const endDate = new Date(event.end);
    const updateTimer = () => {
      setTimeRemaining(getTimeRemaining(endDate));
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [event]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const fetchRegistrationStatus = async () => {
      setRegistrationLoading(true);
      setRegistrationError(null);

      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events/${eventId}/registration-status`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setRegistrationStatus(data);
      } catch (err) {
        console.error('Failed to load registration status:', err);
        setRegistrationError('Could not load registration status');
      } finally {
        setRegistrationLoading(false);
      }
    };

    fetchRegistrationStatus();
  }, [eventId]);

  const handleRegister = async () => {
    if (!eventId || !registrationStatus?.canRegister) {
      return;
    }

    setIsRegistering(true);

    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${REST_URL}/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setRegistrationStatus((prev) =>
        prev
          ? {
              ...prev,
              isRegistered: true,
              canRegister: false,
            }
          : prev,
      );

      toast({
        title: 'Registered',
        description: 'You are now registered for this event.',
      });
    } catch (err) {
      console.error('Failed to register for event:', err);
      toast({
        title: 'Registration failed',
        description: 'Could not register for this event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  useEffect(() => {
    if (!eventId || activeTab !== 'leaderboard') {
      return;
    }

    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardError(null);

      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events/${eventId}/leaderboard`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setLeaderboard(data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
        setLeaderboardError('Failed to load leaderboard');
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [eventId, activeTab]);

  useEffect(() => {
    if (!eventId) {
      return;
    }

    const fetchQuestions = async () => {
      setQuestionsLoading(true);
      setQuestionsError(null);

      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events/${eventId}/questions`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setQuestions(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error('Failed to load event questions:', err);
        setQuestionsError('Failed to load Q&A');
      } finally {
        setQuestionsLoading(false);
      }
    };

    fetchQuestions();
  }, [eventId]);

  const handleAskQuestion = async () => {
    if (!eventId || !questionDraft.trim()) {
      return;
    }

    setIsSubmittingQuestion(true);

    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${REST_URL}/events/${eventId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          data: {
            question: questionDraft.trim(),
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'Failed to submit question');
      }

      setQuestionDraft('');
      toast({
        title: 'Question submitted',
        description: 'Your question was sent to organizers and will appear once answered.',
      });
    } catch (err) {
      toast({
        title: 'Failed to submit question',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  useEffect(() => {
    if (!eventId || !event || !registrationStatus?.isRegistered) {
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
        const eventEnded = event.end ? new Date(event.end).getTime() <= Date.now() : false;

        for (const problem of event.problems || []) {
          const latestSubmission = latestByProblem.get(problem.documentId);
          if (!latestSubmission) {
            nextStatusById[problem.documentId] = 'not_tried';
            continue;
          }

          const mode = problem.leaderboardVisibilityMode || 'public_only_live';
          const shouldUseInLiveStatus = (testCase?: { hidden?: boolean; locked?: boolean }) => {
            if (!testCase) {
              return false;
            }

            if (eventEnded || mode === 'full_live') {
              return true;
            }

            return !testCase.hidden && !testCase.locked;
          };

          const scopedExecutionResults = (latestSubmission.executions || []).filter(
            (execution) => shouldUseInLiveStatus(execution.testCase),
          );

          const scopedCountFromProblem = (problem.testCases || []).filter((testCase: any) =>
            shouldUseInLiveStatus(testCase)
          ).length;
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
  }, [eventId, event, registrationStatus?.isRegistered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">Failed to load event.</p>
      </div>
    );
  }

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const now = new Date();
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = startDate > now;
  const isEnded = endDate < now;
  const problems = event.problems || [];
  const visibleProblems = isUpcoming ? [] : problems;
  const isRegisteredForEvent = registrationStatus?.isRegistered ?? false;
  const showRegisterButton = !!registrationStatus?.canRegister;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b pb-6 mb-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contests
        </Link>
        
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
              {isActive && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs text-emerald-500 font-medium">LIVE</span>
                </span>
              )}
              {isUpcoming && (
                <Badge variant="secondary">Upcoming</Badge>
              )}
              {isEnded && (
                <Badge variant="outline" className="text-muted-foreground">Ended</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}
                {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>·</span>
              <span>{visibleProblems.length} {visibleProblems.length === 1 ? 'problem' : 'problems'}</span>
            </div>
          </div>

          {isActive && (
            <div className="text-right shrink-0">
              <div className="text-xs text-muted-foreground mb-1">Time Remaining</div>
              <div className="font-mono text-2xl font-semibold text-amber-500 tabular-nums">
                {timeRemaining}
              </div>
            </div>
          )}

          {!registrationLoading && registrationStatus && (
            <div className="shrink-0 flex items-center gap-2">
              {registrationStatus.isRegistered ? (
                <Badge variant="secondary">Registered</Badge>
              ) : showRegisterButton ? (
                <Button size="sm" onClick={handleRegister} disabled={isRegistering}>
                  {isRegistering ? 'Registering...' : 'Register'}
                </Button>
              ) : !registrationStatus.registrationOpen ? (
                <Badge variant="outline">Registration closed</Badge>
              ) : registrationStatus.registrationMode === 'invite_only' ? (
                <Badge variant="outline">
                  {registrationStatus.isEligible ? 'Invite only' : 'Not invited'}
                </Badge>
              ) : null}
            </div>
          )}

          {!registrationLoading && !registrationStatus && registrationError && (
            <div className="shrink-0">
              <Badge variant="outline">Registration status unavailable</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="qa" className="gap-2">
            Q&A
            {questions.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {questions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="problems" className="mt-0">
          {!isRegisteredForEvent ? (
            <div className="text-center py-16 border rounded-lg">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-medium mb-1">Registration required</h3>
              <p className="text-sm text-muted-foreground">
                Register for this event to access and solve problems.
              </p>
            </div>
          ) : visibleProblems.length === 0 ? (
            <div className="text-center py-16 border rounded-lg">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-medium mb-1">No problems yet</h3>
              <p className="text-sm text-muted-foreground">
                {isUpcoming ? 'Problems will be revealed when the contest starts' : 'No problems have been added to this contest'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Problem</TableHead>
                    <TableHead className="w-24 text-center">Difficulty</TableHead>
                    <TableHead className="w-20 text-center">Points</TableHead>
                    <TableHead className="w-20 text-center">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProblems.map((problem, index) => (
                    <TableRow 
                      key={problem.documentId}
                      className="group cursor-pointer"
                      onClick={() => {
                        if (!isRegisteredForEvent) {
                          return;
                        }
                        window.location.href = `/compete/${problem.documentId}`;
                      }}
                    >
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/compete/${problem.documentId}`}
                          className="font-medium group-hover:text-primary transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {problem.title}
                        </Link>
                        {problem.testCases && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {problem.testCases.length} tests
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn("text-sm font-medium", getDifficultyColor(problem.difficulty))}>
                          {problem.difficulty || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {problem.points ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Circle
                          className={cn(
                            'h-4 w-4 mx-auto',
                            getProblemStatusClass(problemStatusById[problem.documentId]),
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-0">
          <div className="border rounded-lg p-6">
            {event.description ? (
              <div className="prose prose-sm prose-invert max-w-none">
                <Markdown content={event.description} />
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No description provided.</p>
            )}

            {event.supportedLanguages && event.supportedLanguages.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-3">Supported Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {event.supportedLanguages.map((lang: any) => (
                    <Badge key={lang.documentId} variant="secondary" className="font-normal">
                      {lang.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="qa" className="mt-0">
          <div className="space-y-6">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-medium">Ask organizers a question</h3>
              <textarea
                className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={questionDraft}
                onChange={(e) => setQuestionDraft(e.target.value)}
                placeholder="Write your question here..."
                maxLength={2000}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Only answered questions are shown publicly in this tab.
                </p>
                <Button
                  onClick={handleAskQuestion}
                  disabled={isSubmittingQuestion || !questionDraft.trim() || !isRegisteredForEvent}
                >
                  {isSubmittingQuestion ? 'Submitting...' : 'Submit question'}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              {questionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : questionsError ? (
                <p className="text-sm text-destructive">{questionsError}</p>
              ) : questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No answered questions yet.</p>
              ) : (
                <div className="space-y-4">
                  {questions.map((item) => (
                    <div key={item.documentId} className="rounded-md border p-4 space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Question</p>
                        <p className="text-sm">{item.question}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Answer</p>
                        <p className="text-sm">{item.answer}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Answered by {item.answeredBy?.displayName || 'organizer'}
                          {item.answeredAt ? ` • ${new Date(item.answeredAt).toLocaleString()}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-0">
          <div className="border rounded-lg overflow-hidden">
            {leaderboardLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : leaderboardError ? (
              <div className="text-center py-16">
                <p className="text-sm text-destructive">{leaderboardError}</p>
              </div>
            ) : leaderboard && leaderboard.leaderboardAvailable === false ? (
              <div className="text-center py-16">
                <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Leaderboard locked</h3>
                <p className="text-sm text-muted-foreground">
                  Leaderboard will be available when the contest starts.
                </p>
              </div>
            ) : !leaderboard || leaderboard.leaderboard.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-medium mb-1">Leaderboard</h3>
                <p className="text-sm text-muted-foreground">
                  Rankings will appear here once participants start solving problems
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-16 text-center">#</TableHead>
                      <TableHead>Participant</TableHead>
                      <TableHead className="w-24 text-center">Solved</TableHead>
                      <TableHead className="w-28 text-center">Score</TableHead>
                      <TableHead className="w-28 text-center">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.leaderboard.map((row) => (
                      <TableRow key={row.user.documentId}>
                        <TableCell className="text-center font-mono">{row.rank}</TableCell>
                        <TableCell className="font-medium">{row.user.displayName}</TableCell>
                        <TableCell className="text-center font-mono">{row.solvedCount}</TableCell>
                        <TableCell className="text-center font-mono">{row.totalScore.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-mono">{row.totalTime.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
