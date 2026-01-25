import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Code, Calendar, Clock, Trophy, Play } from 'lucide-react';
import { REST_URL } from '@/config';
import Markdown from '@/components/Markdown';

interface Event {
  title: string;
  description: string;
  start: string;
  end: string;
  problem?: {
    documentId: string;
    title: string;
    description: string;
    slug: string;
    testCases?: any[];
  };
  supportedLanguages?: any[];
}

export default function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        console.log('Event detail API response:', data);
        
        // Handle both wrapped and unwrapped responses
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load event. Please try again later.</p>
      </div>
    );
  }

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const now = new Date();
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = startDate > now;
  const isEnded = endDate < now;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                {event.title}
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{startDate.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                    {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            {isActive && !isEnded && (
              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">
                Live Now
              </Badge>
            )}
            {isUpcoming && (
              <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">
                Upcoming
              </Badge>
            )}
            {isEnded && (
              <Badge variant="secondary">
                Ended
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Side - Event Description */}
        <div className="lg:col-span-1">
          <Card className="border-purple-500/20 bg-gradient-to-br from-gray-900 to-gray-800/50 sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">About This Event</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm prose-invert max-w-none">
                <Markdown content={event.description?.substring(0, 500) || ''} />
                {event.description && event.description.length > 500 && (
                  <p className="text-xs text-muted-foreground mt-2">...</p>
                )}
              </div>
              
              {event.supportedLanguages && event.supportedLanguages.length > 0 && (
                <div className="pt-4 border-t border-purple-500/20">
                  <h4 className="text-sm font-semibold mb-2">Supported Languages</h4>
                  <div className="flex flex-wrap gap-2">
                    {event.supportedLanguages.map((lang: any) => (
                      <Badge key={lang.documentId} variant="secondary" className="text-xs">
                        {lang.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Problems */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-400" />
              <h2 className="text-2xl font-bold">Challenge Problem</h2>
            </div>

            {!event.problem ? (
              <Card className="border-purple-500/20">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Code className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No problem available yet</h3>
                  <p className="text-muted-foreground text-center">
                    The problem for this event will be revealed soon.<br />
                    Check back later!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="hover:shadow-lg hover:shadow-purple-500/20 transition-all border-purple-500/20 bg-gradient-to-br from-gray-900 to-gray-800/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{event.problem.title}</CardTitle>
                      <CardDescription className="text-base">
                        {event.problem.testCases && event.problem.testCases.length > 0 && (
                          <span className="text-muted-foreground">
                            {event.problem.testCases.length} test cases
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <Button 
                      asChild 
                      size="lg"
                      disabled={isEnded}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Link to={`/compete/${event.problem.documentId}`}>
                        <Play className="mr-2 h-5 w-5" />
                        {isEnded ? 'Event Ended' : 'Start Solving'}
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert max-w-none">
                    <Markdown content={event.problem.description?.substring(0, 800) || ''} />
                    {event.problem.description && event.problem.description.length > 800 && (
                      <div className="mt-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                        <p className="text-sm text-muted-foreground m-0">
                          Click "Start Solving" to view the full problem description and submit your solution.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
