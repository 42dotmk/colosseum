import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Play, CheckCircle2, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REST_URL } from '@/config';
import Markdown from '@/components/Markdown';

interface Problem {
  title: string;
  description: string;
  slug: string;
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

interface Language {
  documentId: string;
  name: string;
  codeName: string;
  entrypoint: string;
  defaultMaxCpuTime: number;
  defaultMaxMemory: number;
}

interface Execution {
  documentId: string;
  stdout: string;
  stderr: string;
  executionTime: number;
  processed: boolean;
  testCase?: {
    documentId: string;
    input: string;
    output: string;
    hidden: boolean;
  };
}

interface Submission {
  documentId: string;
  code: string;
  createdAt: string;
  language: {
    documentId: string;
    name: string;
    codeName: string;
  };
  executions: Execution[];
}

export default function CompetePage() {
  const { problemId } = useParams();
  const { toast } = useToast();
  const [code, setCode] = useState('// Write your solution here\n');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [languages, setLanguages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTab, setActiveTab] = useState('description');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialCodeLoadedRef = useRef(false);

  // Fetch submissions from API
  const fetchSubmissions = async (loadCodeFromSubmission = false) => {
    try {
      const token = localStorage.getItem('jwt');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const headers = {
        Authorization: token ? `Bearer ${token}` : '',
      };

      const submissionsRes = await fetch(
        `${REST_URL}/submissions?filters[problem][documentId][$eq]=${problemId}&populate[language]=*&populate[executions][populate][testCase][fields][0]=documentId&populate[executions][populate][testCase][fields][1]=input&populate[executions][populate][testCase][fields][2]=output&populate[executions][populate][testCase][fields][3]=hidden&sort=createdAt:desc`,
        { headers }
      );

      if (submissionsRes.ok) {
        const submissionsData = await submissionsRes.json();
        const submissionsArray = Array.isArray(submissionsData) ? submissionsData : (submissionsData.data || []);
        setSubmissions(submissionsArray);
        
        // Load code from latest submission only on initial load or when explicitly requested
        if (loadCodeFromSubmission && submissionsArray.length > 0 && submissionsArray[0].code && !initialCodeLoadedRef.current) {
          setCode(submissionsArray[0].code);
          if (submissionsArray[0].language?.documentId) {
            setSelectedLanguage(submissionsArray[0].language.documentId);
          }
          initialCodeLoadedRef.current = true;
        }
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
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
        await fetchSubmissions(true);
      } catch (err) {
        console.error('Failed to load problem:', err);
        setError('Failed to load problem');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [problemId]);

  const testCases = problem?.testCases || [];
  const publicTestCases = testCases.filter((tc: TestCase) => !tc.hidden);

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

  // Poll submissions for updates
  useEffect(() => {
    if (submissions.length === 0) return;

    // Check if any submission has unprocessed executions
    const hasUnprocessed = submissions.some(sub => 
      sub.executions?.some(exec => !exec.processed)
    );

    if (!hasUnprocessed) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const pollSubmissions = async () => {
      await fetchSubmissions();
      
      // Check if all done and show toast
      const updatedHasUnprocessed = submissions.some(sub => 
        sub.executions?.some(exec => !exec.processed)
      );
      
      if (!updatedHasUnprocessed && submissions.length > 0) {
        const latestSub = submissions[0];
        if (latestSub.executions) {
          const passed = latestSub.executions.filter((exec: Execution) => 
            exec.stdout?.trim() === exec.testCase?.output?.trim()
          ).length;
          toast({
            title: 'Execution Complete',
            description: `${passed}/${latestSub.executions.length} test cases passed`,
            variant: passed === latestSub.executions.length ? 'default' : 'destructive',
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
  }, [submissions, toast]);

  const handleSubmit = async () => {
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
          },
        }),
      });

      const submissionData = await submissionRes.json();
      const submissionId = submissionData.data.documentId;

      // Submit for execution
      const submitRes = await fetch(`${REST_URL}/submissions/submit?id=${submissionId}`, {
        headers,
      });

      const submitData = await submitRes.json();
      console.log('Submit response:', submitData);

      if (submitData.executions && submitData.executions.length > 0) {
        // Fetch updated submissions
        await fetchSubmissions();
        // Switch to submissions tab
        setActiveTab('results');
        toast({
          title: 'Submitted!',
          description: 'Your code is being executed...',
        });
      } else {
        throw new Error('No executions returned');
      }
    } catch (err) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-gray-900 via-purple-900/10 to-indigo-900/10" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            {problem.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[180px]">
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
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Play className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
        {/* Left Panel - Problem Description */}
        <Card className="flex flex-col overflow-hidden border-purple-500/20 bg-gradient-to-br from-gray-900 to-gray-800/50">
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="testcases">Test Cases</TabsTrigger>
                <TabsTrigger value="results">
                  Submissions
                  {submissions.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {submissions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="mt-4 overflow-auto max-h-[calc(100vh-16rem)]">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Problem Statement</h3>
                    <Markdown content={problem.description || ''} />
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">Test Cases:</span>{' '}
                      {testCases.length} total, {publicTestCases.length} visible
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="testcases" className="mt-4 overflow-auto max-h-[calc(100vh-16rem)]">
                <div className="space-y-4">
                  {publicTestCases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No public test cases available</p>
                  ) : (
                    publicTestCases.map((tc: any, index: number) => (
                      <Card key={tc.documentId} className="border-purple-500/20 bg-gradient-to-br from-gray-800 to-gray-900">
                        <CardHeader>
                          <CardTitle className="text-sm">Test Case {index + 1}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <p className="text-xs font-semibold mb-1">Input:</p>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                              {tc.input}
                            </pre>
                          </div>
                          <div>
                            <p className="text-xs font-semibold mb-1">Expected Output:</p>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                              {tc.output}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="results" className="mt-4 overflow-auto max-h-[calc(100vh-16rem)]">
                <div className="space-y-6">
                  {submissions.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No submissions yet. Submit your code to see results.
                      </p>
                    </div>
                  ) : (
                    <>
                      {submissions.map((submission, subIndex) => {
                        const executions = submission.executions || [];
                        const hasUnprocessed = executions.some(exec => !exec.processed);
                        const passedCount = executions.filter((exec: Execution) => 
                          exec.processed && exec.stdout?.trim() === exec.testCase?.output?.trim()
                        ).length;

                        return (
                          <div key={submission.documentId} className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="text-sm font-semibold">
                                    Submission #{submissions.length - subIndex}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(submission.createdAt).toLocaleString()} • {submission.language?.name}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {hasUnprocessed ? (
                                  <Badge variant="secondary" className="gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Running
                                  </Badge>
                                ) : (
                                  <Badge 
                                    className={cn(
                                      "gap-1",
                                      passedCount === executions.length 
                                        ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                                        : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                                    )}
                                  >
                                    {passedCount}/{executions.length} Passed
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2 pl-4 border-l-2 border-purple-500/20">
                              {executions.map((execution, index) => {
                                const isPassed = execution.processed && 
                                  execution.stdout?.trim() === execution.testCase?.output?.trim();
                                const isFailed = execution.processed && !isPassed;
                                const isRunning = !execution.processed;

                                return (
                                  <Card 
                                    key={execution.documentId} 
                                    className={cn(
                                      "border-purple-500/20 bg-gradient-to-br from-gray-800 to-gray-900",
                                      isPassed && "border-green-500/30",
                                      isFailed && "border-red-500/30"
                                    )}
                                  >
                                    <CardHeader>
                                      <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                          {execution.testCase?.hidden ? (
                                            <>Hidden Test Case {index + 1}</>
                                          ) : (
                                            <>Test Case {index + 1}</>
                                          )}
                                        </CardTitle>
                                        {isRunning && (
                                          <Badge variant="secondary" className="gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Running
                                          </Badge>
                                        )}
                                        {isPassed && (
                                          <Badge className="gap-1 bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Passed
                                          </Badge>
                                        )}
                                        {isFailed && (
                                          <Badge variant="destructive" className="gap-1">
                                            <XCircle className="h-3 w-3" />
                                            Failed
                                          </Badge>
                                        )}
                                      </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      {execution.processed && (
                                        <>
                                          {!execution.testCase?.hidden && (
                                            <>
                                              <div>
                                                <p className="text-xs font-semibold mb-1">Input:</p>
                                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                  {execution.testCase?.input}
                                                </pre>
                                              </div>
                                              <div>
                                                <p className="text-xs font-semibold mb-1">Expected Output:</p>
                                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                  {execution.testCase?.output}
                                                </pre>
                                              </div>
                                            </>
                                          )}
                                          
                                          <div>
                                            <p className="text-xs font-semibold mb-1">Your Output:</p>
                                            <pre className={cn(
                                              "text-xs p-2 rounded overflow-x-auto",
                                              isPassed ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                            )}>
                                              {execution.stdout || '(empty)'}
                                            </pre>
                                          </div>
                                          
                                          {execution.stderr && (
                                            <div>
                                              <p className="text-xs font-semibold mb-1 text-red-400">Error Output:</p>
                                              <pre className="text-xs bg-red-500/10 text-red-400 p-2 rounded overflow-x-auto">
                                                {execution.stderr}
                                              </pre>
                                            </div>
                                          )}
                                          
                                          {execution.executionTime >= 0 && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-purple-500/20">
                                              <Clock className="h-3 w-3" />
                                              <span>Execution time: {execution.executionTime}ms</span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Right Panel - Code Editor */}
        <Card className="flex flex-col overflow-hidden border-purple-500/20 bg-gradient-to-br from-gray-900 to-gray-800/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Code Editor</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Editor
              height="100%"
              language={getEditorLanguage(selectedLang?.codeName)}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
              onMount={(editor, monaco) => {
                // Add Cmd/Ctrl+Enter keybinding for submit
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  handleSubmit();
                });
              }}
            />
          </CardContent>
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
