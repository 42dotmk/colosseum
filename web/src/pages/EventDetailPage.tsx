import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Circle, ChevronRight, FileText, Trophy } from 'lucide-react';
import { REST_URL } from '@/config';
import Markdown from '@/components/Markdown';
import { cn } from '@/lib/utils';

interface Problem {
  documentId: string;
  title: string;
  description: string;
  slug: string;
  difficulty?: string;
  points?: number;
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
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('problems');
  const [timeRemaining, setTimeRemaining] = useState('');

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
              <span>{problems.length} {problems.length === 1 ? 'problem' : 'problems'}</span>
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
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="problems" className="mt-0">
          {problems.length === 0 ? (
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
                  {problems.map((problem, index) => (
                    <TableRow 
                      key={problem.documentId}
                      className="group cursor-pointer"
                      onClick={() => window.location.href = `/compete/${problem.documentId}`}
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
                        {problem.points || 100}
                      </TableCell>
                      <TableCell className="text-center">
                        <Circle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
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

        <TabsContent value="leaderboard" className="mt-0">
          <div className="text-center py-16 border rounded-lg">
            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-medium mb-1">Leaderboard</h3>
            <p className="text-sm text-muted-foreground">
              Rankings will appear here once participants start solving problems
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
