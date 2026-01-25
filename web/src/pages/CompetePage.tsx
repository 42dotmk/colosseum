import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="-ml-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-medium">
            {problem.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={handleSubmit} disabled={isSubmitting} size="sm">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {isSubmitting ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Main content - two panel layout */}
      <div className="flex-1 grid grid-cols-2 gap-3 min-h-0">
        {/* Left Panel - Problem Description */}
        <Card className="flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="border-b px-4 py-2">
              <TabsList className="h-8">
                <TabsTrigger value="description" className="text-xs px-3 h-7">Problem</TabsTrigger>
                <TabsTrigger value="testcases" className="text-xs px-3 h-7">Tests</TabsTrigger>
                <TabsTrigger value="results" className="text-xs px-3 h-7">
                  Results
                  {submissions.length > 0 && (
                    <span className="ml-1.5 text-xs text-muted-foreground">({submissions.length})</span>
                  )}
                </TabsTrigger>
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
                      const executions = submission.executions || [];
                      const hasUnprocessed = executions.some(exec => !exec.processed);
                      const passedCount = executions.filter((exec: Execution) => 
                        exec.processed && exec.stdout?.trim() === exec.testCase?.output?.trim()
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
                              const isPassed = execution.processed && 
                                execution.stdout?.trim() === execution.testCase?.output?.trim();
                              const isFailed = execution.processed && !isPassed;
                              const isRunning = !execution.processed;

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
                                      {!execution.testCase?.hidden && (
                                        <>
                                          <div>
                                            <div className="text-xs text-muted-foreground mb-1">Input</div>
                                            <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                                              {execution.testCase?.input}
                                            </pre>
                                          </div>
                                          <div>
                                            <div className="text-xs text-muted-foreground mb-1">Expected</div>
                                            <pre className="text-xs bg-muted p-2 rounded font-mono overflow-x-auto">
                                              {execution.testCase?.output}
                                            </pre>
                                          </div>
                                        </>
                                      )}
                                      
                                      <div>
                                        <div className="text-xs text-muted-foreground mb-1">Output</div>
                                        <pre className={cn(
                                          "text-xs p-2 rounded font-mono overflow-x-auto",
                                          isPassed ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"
                                        )}>
                                          {execution.stdout || '(empty)'}
                                        </pre>
                                      </div>
                                      
                                      {execution.stderr && (
                                        <div>
                                          <div className="text-xs text-destructive mb-1">Error</div>
                                          <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded font-mono overflow-x-auto">
                                            {execution.stderr}
                                          </pre>
                                        </div>
                                      )}
                                      
                                      {execution.executionTime >= 0 && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                                          <Clock className="h-3 w-3" />
                                          {execution.executionTime}ms
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
            </div>
          </Tabs>
        </Card>

        {/* Right Panel - Code Editor */}
        <Card className="flex flex-col overflow-hidden">
          <div className="border-b px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground">Editor</span>
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
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
                  handleSubmit();
                });
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
