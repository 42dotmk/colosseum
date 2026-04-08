import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCppLsp } from '@/lib/lsp/useCppLsp';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Play, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REST_URL } from '@/config';
import Markdown from '@/components/Markdown';

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

interface Problem {
  id: number;
  title: string;
  description: string;
  slug: string;
  points: number;
  isInteractive?: boolean;
  interactorSource?: string;
  checkerSource?: string;
  testCases?: TestCase[];
  starterCodes?: any[];
}

interface TestCase {
  documentId: string;
  input: string;
  output: string;
  hidden: boolean;
  locked: boolean;
  weight: number;
  explanation?: string;
}

interface Execution {
  id?: string;
  documentId: string;
  stdout: string;
  stderr: string;
  executionTime: number;
  processed: boolean;
  passed?: boolean;
  testCase?: {
    documentId: string;
    input: string;
    output: string;
    hidden: boolean;
    locked?: boolean;
  };
}

interface Submission {
  documentId: string;
  code: string;
  createdAt: string;
  metadata?: {
    mode?: string;
    sourceEvent?: string;
  };
  language: {
    documentId: string;
    name: string;
    codeName: string;
  };
  executions: Execution[];
}

export default function CompetePage() {
  const { problemId } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState('// Write your solution here\n');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [previousProblem, setPreviousProblem] = useState<EventProblem | null>(null);
  const [nextProblem, setNextProblem] = useState<EventProblem | null>(null);
  const [events,setEvents] = useState<EventItem[]>([])
  const [languages, setLanguages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [executionIdsBySubmission, setExecutionIdsBySubmission] = useState<Record<string, string[]>>({});
  const [executionOverrides, setExecutionOverrides] = useState<Record<string, Execution[]>>({});
  const [activeTab, setActiveTab] = useState('description');
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialCodeLoadedRef = useRef(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const navigate = useNavigate();

  // LSP — must be unconditional (before any early returns)
  const isCpp = languages.find((l: any) => l.documentId === selectedLanguage)?.codeName === 'cpp';
  const [lspEnabled, setLspEnabled] = useState(false);
  const { lspState, attachLsp, detachLsp } = useCppLsp(isCpp && lspEnabled);

  const query = new URLSearchParams(location.search);
  const isViewMode = query.get('mode') === 'view';
  const isTrainingMode = query.get('mode') === 'training';

  const isExecutionPassed = (exec: Execution) => {
    if (!exec.processed) {
      return false;
    }

    if (typeof exec.passed === 'boolean') {
      return exec.passed;
    }

    return exec.stdout?.trim() === exec.testCase?.output?.trim();
  };

  const getSubmissionExecutions = (submission: Submission) =>
    executionOverrides[submission.documentId]?.length
      ? executionOverrides[submission.documentId]
      : (submission.executions || []);

  const fetchExecutionResults = async (ids: string[]): Promise<Execution[]> => {
    if (!ids.length) {
      return [];
    }

    try {
      const token = localStorage.getItem('jwt');
      const headers = {
        Authorization: token ? `Bearer ${token}` : '',
      };

      const response = await fetch(
        `${REST_URL}/submissions/executions?ids=${ids.join(',')}`,
        { headers }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const executions = data?.executions || [];

      return executions.map((exec: any) => ({
        id: exec.id,
        documentId: exec.id,
        stdout: exec.stdout || '',
        stderr: exec.stderr || '',
        executionTime: typeof exec.executionTime === 'number' ? exec.executionTime : -1,
        processed: !!exec.processed,
        passed: typeof exec.passed === 'boolean' ? exec.passed : undefined,
        testCase: exec.testCase
          ? {
              documentId: exec.testCase.id,
              input: exec.testCase.input,
              output: exec.testCase.output,
              hidden: !!exec.testCase.hidden,
              locked: !!exec.testCase.locked,
            }
          : undefined,
      }));
    } catch (err) {
      console.error('Failed to fetch execution results:', err);
      return [];
    }
  };

  const fetchExecutionsForSubmission = async (submissionId: string): Promise<Execution[]> => {
    if (!submissionId) {
      return [];
    }

    try {
      const token = localStorage.getItem('jwt');
      const headers = {
        Authorization: token ? `Bearer ${token}` : '',
      };

      const response = await fetch(
        `${REST_URL}/executions?filters[submission][documentId][$eq]=${submissionId}&populate[testCase]=*&sort=createdAt:asc`,
        { headers }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const executionsArray = Array.isArray(data) ? data : (data.data || []);

      return executionsArray.map((exec: any) => ({
        id: exec.documentId,
        documentId: exec.documentId,
        stdout: exec.stdout || '',
        stderr: exec.stderr || '',
        executionTime: typeof exec.executionTime === 'number' ? exec.executionTime : -1,
        processed: !!exec.processed,
        passed: typeof exec.passed === 'boolean' ? exec.passed : undefined,
        testCase: exec.testCase
          ? {
              documentId: exec.testCase.documentId,
              input: exec.testCase.input,
              output: exec.testCase.output,
              hidden: !!exec.testCase.hidden,
              locked: !!exec.testCase.locked,
            }
          : undefined,
      }));
    } catch (err) {
      console.error('Failed to fetch executions for submission:', err);
      return [];
    }
  };

  // Fetch submissions from API
  const fetchSubmissions = async (loadCodeFromSubmission = false): Promise<Submission[]> => {
    try {
      const token = localStorage.getItem('jwt');
      const headers = {
        Authorization: token ? `Bearer ${token}` : '',
      };

      const submissionsRes = await fetch(
        `${REST_URL}/submissions?filters[problem][documentId][$eq]=${problemId}&populate[language]=*&populate[executions][populate][testCase][fields][0]=documentId&populate[executions][populate][testCase][fields][1]=input&populate[executions][populate][testCase][fields][2]=output&populate[executions][populate][testCase][fields][3]=hidden&populate[executions][populate][testCase][fields][4]=locked&sort=createdAt:desc`,
        { headers }
      );

      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        const submissionsArray = Array.isArray(submissionsData) ? submissionsData : (submissionsData.data || []);
        const filteredSubmissions = submissionsArray.filter((submission: Submission) => {
          const mode = submission?.metadata?.mode;
          if (isTrainingMode) {
            return mode === 'practice';
          }

          return mode !== 'practice';
        });

        setSubmissions(filteredSubmissions);

        const submissionsWithoutExecutions = filteredSubmissions.filter(
          (submission: Submission) => !submission.executions || submission.executions.length === 0
        );

        if (submissionsWithoutExecutions.length > 0) {
          const fallbackResults = await Promise.all(
            submissionsWithoutExecutions.map(async (submission: Submission) => {
              const executions = await fetchExecutionsForSubmission(submission.documentId);
              return { submissionId: submission.documentId, executions };
            })
          );

          const nextOverrides: Record<string, Execution[]> = {};
          const nextExecutionIds: Record<string, string[]> = {};

          for (const result of fallbackResults) {
            if (!result.executions.length) {
              continue;
            }

            nextOverrides[result.submissionId] = result.executions;
            nextExecutionIds[result.submissionId] = result.executions
              .map((exec: Execution) => exec.documentId)
              .filter(Boolean);
          }

          if (Object.keys(nextOverrides).length > 0) {
            setExecutionOverrides((prev) => ({
              ...prev,
              ...nextOverrides,
            }));
          }

          if (Object.keys(nextExecutionIds).length > 0) {
            setExecutionIdsBySubmission((prev) => ({
              ...prev,
              ...nextExecutionIds,
            }));
          }
        }
        
        // Load code from latest submission only on initial load or when explicitly requested
        if (loadCodeFromSubmission && filteredSubmissions.length > 0 && filteredSubmissions[0].code && !initialCodeLoadedRef.current) {
          setCode(filteredSubmissions[0].code);
          if (filteredSubmissions[0].language?.documentId) {
            setSelectedLanguage(filteredSubmissions[0].language.documentId);
          }
          initialCodeLoadedRef.current = true;
        }

        return filteredSubmissions;
      }

      return [];
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const headers = {
          Authorization: token ? `Bearer ${token}` : '',
        };

        const [problemRes, languagesRes] = await Promise.all([
          fetch(`${REST_URL}/problems/${problemId}?populate=*`, { headers }),
          fetch(`${REST_URL}/languages`, { headers }),
        ]);

        if (!problemRes.ok || !languagesRes.ok) {
          throw new Error('HTTP error fetching data');
        }

        const problemData = await problemRes.json();
        const languagesData = await languagesRes.json();
        
        console.log('Problem API response:', problemData);
        console.log('Languages API response:', languagesData);

        // Handle both wrapped and unwrapped responses
        setProblem(problemData.data || problemData);
        setLanguages(Array.isArray(languagesData) ? languagesData : (languagesData.data || []));
        
        // Fetch user's submissions and load code from latest submission
        if (!isViewMode) {
          await fetchSubmissions(true);
        }
      } catch (err) {
        console.error('Failed to load problem:', err);
        setError('Failed to load problem');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [problemId, isViewMode, isTrainingMode]);

  const testCases = problem?.testCases || [];
  const publicTestCases = testCases.filter((tc: TestCase) => !tc.hidden && !tc.locked);

  useEffect(() => {
    if (languages.length > 0 && !selectedLanguage) {
      setSelectedLanguage(languages[0].documentId);
    }
  }, [languages, selectedLanguage]);

  // Keyboard shortcuts for tab switching (Cmd/Ctrl+Enter handled in Monaco editor)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+1, Alt+2, Alt+3 for tab switching
      if (e.altKey && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        const tabMap: Record<string, string> = {
          '1': 'description',
          '2': 'testcases',
          '3': 'results',
        };
        setActiveTab(tabMap[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Attach / detach LSP when switching to/from C++ or toggling the button
  useEffect(() => {
    if (isCpp && lspEnabled && editorRef.current && monacoRef.current) {
      attachLsp(editorRef.current, monacoRef.current);
    } else {
      detachLsp();
    }
  }, [isCpp, lspEnabled, attachLsp, detachLsp]);

  // Poll submissions for updates
  useEffect(() => {
    if (isViewMode) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    if (submissions.length === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Check if any submission has unprocessed executions
    const hasUnprocessed = submissions.some(sub => 
      getSubmissionExecutions(sub).some(exec => !exec.processed)
    );

    if (!hasUnprocessed) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const pollSubmissions = async () => {
      const latestSubmissions = await fetchSubmissions();

      const executionEntries = Object.entries(executionIdsBySubmission);
      if (executionEntries.length > 0) {
        for (const [submissionId, ids] of executionEntries) {
          const results = await fetchExecutionResults(ids);
          if (results.length > 0) {
            setExecutionOverrides((prev) => ({
              ...prev,
              [submissionId]: results,
            }));
          }
        }
      }
      
      // Check if all done and show toast
      const updatedHasUnprocessed = latestSubmissions.some(sub => {
        const executions = executionOverrides[sub.documentId]?.length
          ? executionOverrides[sub.documentId]
          : (sub.executions || []);
        return executions.some(exec => !exec.processed);
      });
      
      if (!updatedHasUnprocessed && latestSubmissions.length > 0) {
        const latestSub = latestSubmissions[0];
        const latestExecutions = getSubmissionExecutions(latestSub);
        if (latestExecutions.length > 0) {
          const passed = latestExecutions.filter((exec: Execution) => isExecutionPassed(exec)).length;
          toast({
            title: 'Execution Complete',
            description: `${passed}/${latestExecutions.length} test cases passed`,
            variant: passed === latestExecutions.length ? 'default' : 'destructive',
          });
        }
      }
    };

    pollingIntervalRef.current = setInterval(pollSubmissions, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [submissions, executionIdsBySubmission, executionOverrides, toast, isViewMode]);

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
    let problemIndex = pastProblems.findIndex(obj => obj.documentId === problemId)
    setPreviousProblem(problemIndex > 0 ?  pastProblems[problemIndex-1] : null);
    setNextProblem((problemIndex +1 < pastProblems.length) ? pastProblems[problemIndex+1] : null)
  },[problemId,pastProblems])

  useEffect(() => {
  const handleTrainingNavigation = (e: KeyboardEvent) => {
    if (!isTrainingMode) return;
    if (!(e.ctrlKey || e.metaKey)) return;

    const target = e.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();

    // optional: don't trigger while typing in inputs
    if (tag === 'input' || tag === 'textarea') return;

    if (e.key === 'ArrowLeft' && previousProblem) {
      e.preventDefault();
      navigate(`/compete/${previousProblem.documentId}?mode=training`);
    }

    if (e.key === 'ArrowRight' && nextProblem) {
      e.preventDefault();
      navigate(`/compete/${nextProblem.documentId}?mode=training`);
    }
  };

  window.addEventListener('keydown', handleTrainingNavigation);
  return () => window.removeEventListener('keydown', handleTrainingNavigation);
}, [isTrainingMode, previousProblem, nextProblem, navigate]);

  const handleSubmit = async () => {
    if (isViewMode) {
      toast({
        title: 'View mode',
        description: 'Submissions are disabled for this problem view.',
      });
      return;
    }

    if (!selectedLanguage) {
      toast({
        title: 'No language selected',
        description: 'Please select a programming language',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('jwt');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      };

      // Create submission
      const submissionRes = await fetch(`${REST_URL}/submissions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            problem: problemId,
            language: selectedLanguage,
            code,
            metadata: {
              mode: isTrainingMode ? 'practice' : 'competition',
            },
            mode: isTrainingMode ? 'practice' : 'competition',
          },
        }),
      });

      const submissionData = await submissionRes.json();
      if (!submissionRes.ok || !submissionData?.data?.documentId) {
        const message =
          submissionData?.error?.message ||
          submissionData?.message ||
          'Failed to create submission';
        throw new Error(message);
      }

      const submissionId = submissionData.data.documentId;

      await fetchSubmissions();
      setActiveTab('results');

      // Submit for execution
      const submitRes = await fetch(`${REST_URL}/submissions/submit?id=${submissionId}`, {
        headers,
      });

      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        const message =
          submitData?.error?.message ||
          submitData?.message ||
          'Failed to submit for execution';
        throw new Error(message);
      }

      console.log('Submit response:', submitData);

      if (submitData.executions && submitData.executions.length > 0) {
        const executionIds = submitData.executions as string[];
        setExecutionIdsBySubmission((prev) => ({
          ...prev,
          [submissionId]: executionIds,
        }));

        const immediateResults = await fetchExecutionResults(executionIds);
        if (immediateResults.length > 0) {
          setExecutionOverrides((prev) => ({
            ...prev,
            [submissionId]: immediateResults,
          }));
        }

        // Fetch updated submissions
        await fetchSubmissions();
        toast({
          title: 'Submitted!',
          description: 'Your code is being executed...',
        });
      } else {
        await fetchSubmissions();
        throw new Error('No executions were queued');
      }
    } catch (err) {
      await fetchSubmissions();
      setActiveTab('results');
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load problem. Please try again later.</p>
      </div>
    );
  }

  const selectedLang = languages.find((l: any) => l.documentId === selectedLanguage);
  const isInteractiveProblem = !!problem.isInteractive;

  const formatExecutionTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    if (seconds >= 1) {
      return `${seconds.toFixed(3).replace(/\.?0+$/, '')}s`;
    }
    return `${Math.round(seconds * 1000)}ms`;
  };

  const formatTimeLimit = (value: number | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—';
    if (value >= 1) {
      return `${value.toFixed(3).replace(/\.?0+$/, '')}s`;
    }
    return `${Math.round(value * 1000)}ms`;
  };

  const formatMemoryLimit = (value: number | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '—';
    if (value >= 1024) {
      const gb = value / 1024;
      return gb % 1 === 0 ? `${gb}GB` : `${gb.toFixed(2).replace(/\.?0+$/, '')}GB`;
    }
    if (value < 1) {
      return `${Math.round(value * 1024)}KB`;
    }
    return value % 1 === 0 ? `${value}MB` : `${value.toFixed(2).replace(/\.?0+$/, '')}MB`;
  };

  const parseInteractiveStderr = (stderr: string) => {
    const source = stderr || '';
    const participantMatch = source.match(/=== PARTICIPANT_OUTPUT ===\n([\s\S]*?)(?=\n=== (?:INTERACTOR_MESSAGE|INTERACTOR_STREAM) ===|$)/);
    const interactorMatch = source.match(/=== INTERACTOR_MESSAGE ===\n([\s\S]*?)(?=\n=== INTERACTOR_STREAM ===|$)/);
    const interactorStreamMatch = source.match(/=== INTERACTOR_STREAM ===\n([\s\S]*)$/);

    const participantOutput = participantMatch?.[1]?.trim() || '';
    const interactorMessage = interactorMatch?.[1]?.trim() || '';
    const interactorStream = interactorStreamMatch?.[1]?.trim() || '';

    const cleaned = source
      .replace(/\n?=== PARTICIPANT_OUTPUT ===\n[\s\S]*?(?=\n=== (?:INTERACTOR_MESSAGE|INTERACTOR_STREAM) ===|$)/, '')
      .replace(/\n?=== INTERACTOR_MESSAGE ===\n[\s\S]*?(?=\n=== INTERACTOR_STREAM ===|$)/, '')
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

  const TrainingNavigation = () => (
  <div className="mt-4 border-t px-4 py-4">
    <div className="grid grid-cols-[minmax(0,18rem)_auto_minmax(0,18rem)] items-center gap-3">
      <div className="flex justify-start">
        {previousProblem ? (
          <Button
            variant="outline"
            className="w-72 justify-start overflow-hidden"
            onClick={() =>
              navigate(`/compete/${previousProblem.documentId}?mode=training`)
            }
          >
            <span className="mr-2 shrink-0">←</span>
            <span className="truncate">
              Previous: {previousProblem.title}
            </span>
          </Button>
        ) : (
          <div className="w-72" />
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center whitespace-nowrap">
        
      </div>

      <div className="flex justify-end">
        {nextProblem ? (
          <Button
            variant="outline"
            className="w-72 justify-between overflow-hidden"
            onClick={() =>
              navigate(`/compete/${nextProblem.documentId}?mode=training`)
            }
          >
            <span className="truncate">
              Next: {nextProblem.title}
            </span>
            <span className="ml-2 shrink-0">→</span>
          </Button>
        ) : (
          <div className="w-72" />
        )}
      </div>
    </div>
  </div>
);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="-ml-2">
            <Link to={isTrainingMode ? '/training' : '/'}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-medium">
            {problem.title}
          </h1>
          {isInteractiveProblem && (
            <Badge variant="secondary" className="h-5 text-[10px]">
              Interactive
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-1">
            <span>Time limit: {formatTimeLimit(selectedLang?.defaultMaxCpuTime)}</span>
            <span>Memory limit: {formatMemoryLimit(selectedLang?.defaultMaxMemory)}</span>
          </div>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang: any) => (
                <SelectItem key={lang.documentId} value={lang.documentId}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSubmit} disabled={isSubmitting || isViewMode} size="sm">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {isViewMode ? 'View only' : (isSubmitting ? 'Running...' : 'Run')}
          </Button>
        </div>
      </div>

      {isViewMode && (
        <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          This problem is opened in view mode from a past event. Submissions are disabled.
        </div>
      )}

      {isTrainingMode && (
        <div className="mb-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
          Training mode: submissions are treated as practice and do not affect contest leaderboard.
        </div>
      )}

      {/* Main content - two panel layout */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {/* Left Panel - Problem Description */}
        <Card className="flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="border-b px-4 py-2">
              <TabsList className="h-8">
                <TabsTrigger value="description" className="text-xs px-3 h-7">Problem</TabsTrigger>
                <TabsTrigger value="testcases" className="text-xs px-3 h-7">Tests</TabsTrigger>
                {!isViewMode && (
                  <TabsTrigger value="results" className="text-xs px-3 h-7">
                    Results
                    {submissions.length > 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">({submissions.length})</span>
                    )}
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <TabsContent value="description" className="mt-0 h-full">
                <div className="space-y-4">
                  <div className="prose prose-sm prose-invert max-w-none">
                    <Markdown content={problem.description || ''} />
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
                    <p className="text-sm text-muted-foreground">No public test cases available</p>
                  ) : (
                    publicTestCases.map((tc: any, index: number) => (
                      <div key={tc.documentId} className="rounded-lg border p-3 space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">Test {index + 1}</div>
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
                      <p className="text-sm text-muted-foreground">
                        No submissions yet
                      </p>
                    </div>
                  ) : (
                    submissions.map((submission, subIndex) => {
                      const executions = sortExecutionsForDisplay(getSubmissionExecutions(submission));
                      const hasUnprocessed = executions.some(exec => !exec.processed);
                      const hasQueueFailure = executions.some((exec: Execution) =>
                        typeof exec.stderr === 'string' && exec.stderr.includes('Queue publish failed')
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
                                {new Date(submission.createdAt).toLocaleTimeString()} • {submission.language?.name}
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
                              const detailsVisible = !execution.testCase?.hidden && !execution.testCase?.locked;
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
                                      {execution.testCase?.hidden ? 'Hidden' : ''} Test {index + 1}
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
                                            <div className="text-xs text-muted-foreground mb-1">Input</div>
                                            <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                                              {execution.testCase?.input}
                                            </pre>
                                          </div>
                                          {!isInteractiveProblem && (
                                            <div>
                                              <div className="text-xs text-muted-foreground mb-1">Expected</div>
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
                                                <div className="text-xs text-muted-foreground mb-1">Your Output</div>
                                                <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                                                  {interactiveDetails?.participantOutput || '(empty)'}
                                                </pre>
                                              </div>

                                              {(interactorDisplay || (isFailed && (interactiveDetails?.fallback || execution.stderr))) && (
                                                <div>
                                                  <div className={cn("text-xs mb-1", isPassed ? "text-muted-foreground" : "text-destructive")}>
                                                    Interactor
                                                  </div>
                                                  <pre className={cn(
                                                    "text-xs p-2 rounded font-mono overflow-x-auto",
                                                    isPassed ? "bg-muted text-foreground" : "bg-destructive/10 text-destructive"
                                                  )}>
                                                    {interactorDisplay || interactiveDetails?.fallback || execution.stderr}
                                                  </pre>
                                                </div>
                                              )}

                                              <div>
                                                <div className="text-xs text-muted-foreground mb-1">Verdict</div>
                                                <pre className={cn(
                                                  "text-xs p-2 rounded font-mono overflow-x-auto",
                                                  isPassed ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
                                                )}>
                                                  {execution.stdout || '(empty)'}
                                                </pre>
                                              </div>
                                            </>
                                          ) : (
                                            <>
                                              <div>
                                                <div className="text-xs text-muted-foreground mb-1">Output</div>
                                                <pre className={cn(
                                                  "text-xs p-2 rounded font-mono overflow-x-auto",
                                                  isPassed ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
                                                )}>
                                                  {execution.stdout || '(empty)'}
                                                </pre>
                                              </div>

                                              {execution.stderr && isFailed && (
                                                <div>
                                                  <div className="text-xs text-destructive mb-1">Error</div>
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
                                          Execution details are hidden for {execution.testCase?.locked ? 'locked' : 'hidden'} tests.
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
          {isTrainingMode && <TrainingNavigation />}
        </Card>

        {/* Right Panel - Code Editor */}
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b px-4 py-2 flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Editor</span>
            {isCpp && (
              <button
                onClick={() => setLspEnabled(v => !v)}
                title={lspEnabled ? 'Disable clangd IntelliSense' : 'Enable clangd IntelliSense'}
                className={cn(
                  'flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium transition-colors',
                  lspEnabled
                    ? lspState === 'ready'
                      ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                      : lspState === 'connecting'
                        ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25'
                        : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <span className={cn(
                  'inline-block w-1.5 h-1.5 rounded-full',
                  lspEnabled
                    ? lspState === 'ready' ? 'bg-green-500'
                      : lspState === 'connecting' ? 'bg-yellow-500 animate-pulse'
                      : 'bg-red-500'
                    : 'bg-muted-foreground'
                )} />
                {lspEnabled
                  ? lspState === 'ready' ? 'clangd on'
                    : lspState === 'connecting' ? 'connecting…'
                    : lspState === 'error' ? 'LSP error'
                    : 'clangd'
                  : 'clangd off'}
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={getEditorLanguage(selectedLang?.codeName)}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                padding: { top: 12 },
              }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  handleSubmit();
                });
                if (isCpp && lspEnabled) {
                  attachLsp(editor, monaco);
                }
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function getEditorLanguage(codeName: string | undefined): string {
  if (!codeName) return 'javascript';
  
  const languageMap: Record<string, string> = {
    'python': 'python',
    'javascript': 'javascript',
    'typescript': 'typescript',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'csharp': 'csharp',
    'go': 'go',
    'rust': 'rust',
  };
  
  return languageMap[codeName] || 'javascript';
}
