import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { REST_URL } from '@/config';

import type { Problem } from './types/Problem';
import type { Submission } from './types/Submission';
import type { Execution } from './types/Execution';
import type { EventItem } from './types/EventItem';
import type { EventProblem } from './types/EventProblem';
import type Language from './types/Language';

import Loading from './components/Loading';
import ErrorComponent from './components/ErrorComponent';
import Header from './components/Header/Header';
import ProblemMode from './components/ProblemMode/ProblemMode';
import LeftPanel from './components/LeftPanel/LeftPanel';
import RightPanel from './components/RightPanel/RightPanel';

export default function CompetePage() {
  const { problemId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const query = new URLSearchParams(location.search);
  const isViewMode = query.get('mode') === 'view';
  const isTrainingMode = query.get('mode') === 'training';

  const [code, setCode] = useState('// Write your solution here\n');
  const [currentLanguage, setCurrentLanguage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [problem, setProblem] = useState<Problem | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'description' | 'testcases' | 'results'>('description');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [executionIdsBySubmission, setExecutionIdsBySubmission] = useState<Record<string, string[]>>({});
  const [executionOverrides, setExecutionOverrides] = useState<Record<string, Execution[]>>({});

  const initialCodeLoadedRef = useRef(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [events, setEvents] = useState<EventItem[]>([]);

  const selectedLanguageObject = languages.find(
    (l: Language) => l.documentId === currentLanguage
  );
  const isInteractiveProblem = !!problem?.isInteractive;

  const getSubmissionExecutions = (submission: Submission) =>
    executionOverrides[submission.documentId]?.length
      ? executionOverrides[submission.documentId]
      : (submission.executions || []);

  const isExecutionPassed = (exec: Execution) => {
    if (!exec.processed) return false;

    if (typeof exec.passed === 'boolean') {
      return exec.passed;
    }

    return exec.stdout?.trim() === exec.testCase?.output?.trim();
  };

  const fetchExecutionResults = async (ids: string[]): Promise<Execution[]> => {
    if (!ids.length) return [];

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
    if (!submissionId) return [];

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

      if (!submissionsRes.ok) {
        return [];
      }

      const submissionsData = await submissionsRes.json();
      const submissionsArray = Array.isArray(submissionsData)
        ? submissionsData
        : (submissionsData.data || []);

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
          if (!result.executions.length) continue;

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

      if (
        loadCodeFromSubmission &&
        filteredSubmissions.length > 0 &&
        filteredSubmissions[0].code &&
        !initialCodeLoadedRef.current
      ) {
        setCode(filteredSubmissions[0].code);

        if (filteredSubmissions[0].language?.documentId) {
          setCurrentLanguage(filteredSubmissions[0].language.documentId);
        }

        initialCodeLoadedRef.current = true;
      }

      return filteredSubmissions;
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

        setProblem(problemData.data || problemData);
        setLanguages(Array.isArray(languagesData) ? languagesData : (languagesData.data || []));

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

  useEffect(() => {
    if (languages.length > 0 && !currentLanguage) {
      setCurrentLanguage(languages[0].documentId);
    }
  }, [languages, currentLanguage]);

  useEffect(() => {
<<<<<<< HEAD
    const fetchEvents = async () => {
=======
    const fetchPastEvents = async () => {
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(
          `${REST_URL}/events?fields[0]=documentId&fields[1]=title&fields[2]=end&populate[problems][fields][0]=documentId&populate[problems][fields][1]=title&populate[problems][fields][2]=points&sort=end:desc`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : '',
            },
          }
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

    if (isTrainingMode) {
<<<<<<< HEAD
      fetchEvents();
=======
      fetchPastEvents();
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
    }
  }, [isTrainingMode]);

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
        }))
      );
  }, [events]);

  const currentProblemIndex = useMemo(() => {
    return pastProblems.findIndex((p) => p.documentId === problemId);
  }, [pastProblems, problemId]);

  const previousProblem: EventProblem | null =
    currentProblemIndex > 0 ? pastProblems[currentProblemIndex - 1] : null;

  const nextProblem: EventProblem | null =
    currentProblemIndex >= 0 && currentProblemIndex + 1 < pastProblems.length
      ? pastProblems[currentProblemIndex + 1]
      : null;

  useEffect(() => {
    const handleTrainingNavigation = (e: KeyboardEvent) => {
      if (!isTrainingMode) return;
      if (!(e.ctrlKey || e.metaKey)) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();

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

    const hasUnprocessed = submissions.some((sub) =>
      getSubmissionExecutions(sub).some((exec) => !exec.processed)
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

      const updatedHasUnprocessed = latestSubmissions.some((sub) => {
        const executions = executionOverrides[sub.documentId]?.length
          ? executionOverrides[sub.documentId]
          : (sub.executions || []);

        return executions.some((exec) => !exec.processed);
      });

      if (!updatedHasUnprocessed && latestSubmissions.length > 0) {
        const latestSub = latestSubmissions[0];
        const latestExecutions = getSubmissionExecutions(latestSub);

        if (latestExecutions.length > 0) {
          const passed = latestExecutions.filter((exec: Execution) =>
            isExecutionPassed(exec)
          ).length;

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
        pollingIntervalRef.current = null;
      }
    };
  }, [submissions, executionIdsBySubmission, executionOverrides, toast, isViewMode]);

  const handleSubmit = async () => {
    if (isViewMode) {
      toast({
        title: 'View mode',
        description: 'Submissions are disabled for this problem view.',
      });
      return;
    }

    if (!currentLanguage) {
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

      const submissionRes = await fetch(`${REST_URL}/submissions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          data: {
            problem: problemId,
            language: currentLanguage,
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
    return <Loading />;
  }

  if (error || !problem) {
    return <ErrorComponent />;
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <Header
<<<<<<< HEAD
        languageProps={{selectedLanguageObject, currentLanguage, setCurrentLanguage, languages}}
        problemProps={{isTrainingMode, isViewMode, problemTitle: problem.title, isInteractiveProblem}}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
=======
        isTrainingMode={isTrainingMode}
        problemTitle={problem.title}
        isInteractiveProblem={isInteractiveProblem}
        selectedLanguageObject={selectedLanguageObject}
        currentLanguage={currentLanguage}
        setCurrentLanguage={setCurrentLanguage}
        languages={languages}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isViewMode={isViewMode}
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
      />

      <ProblemMode isTrainingMode={isTrainingMode} isViewMode={isViewMode} />

      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        <LeftPanel
          isViewMode={isViewMode}
<<<<<<< HEAD
=======
          problemDescription={problem.description}
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
          isInteractiveProblem={isInteractiveProblem}
          problem={problem}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          submissions={submissions}
          executionOverrides={executionOverrides}
          isExecutionPassed={isExecutionPassed}
          isTrainingMode={isTrainingMode}
          previousProblem={previousProblem}
          nextProblem={nextProblem}
        />

        <RightPanel
          selectedLanguageObject={selectedLanguageObject}
          code={code}
          setCode={setCode}
          handleSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}