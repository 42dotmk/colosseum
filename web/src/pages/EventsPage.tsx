import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { REST_URL } from '@/config';

interface Event {
  documentId: string;
  title: string;
  description: string;
  start: string;
  end: string;
  slug: string;
  problem?: any;
  supportedLanguages?: any[];
  publishedAt: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events?populate=*`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Events API response:', data);
        
        // Strapi 5 returns data directly, not wrapped in data.data
        const eventsData = Array.isArray(data) ? data : (data.data || []);
        setEvents(eventsData);
      } catch (err) {
        console.error('Failed to load events:', err);
        setError('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Competitive Events
          </h1>
          <p className="text-muted-foreground mt-2">
            Join coding competitions and test your skills against other developers
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No events available</h3>
            <p className="text-muted-foreground text-center">
              Check back later for upcoming competitions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event: Event) => {
            const problemCount = event.problem ? 1 : 0;
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            const now = new Date();
            const isActive = now >= startDate && now <= endDate && event.publishedAt;
            const isUpcoming = startDate > now;
            const isEnded = endDate < now;

            return (
              <Card key={event.documentId} className="flex flex-col hover:shadow-lg hover:shadow-purple-500/20 transition-all border-purple-500/20 bg-gradient-to-br from-gray-900 to-gray-800/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    {isActive && !isEnded && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        Live
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                        Upcoming
                      </span>
                    )}
                    {isEnded && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                        Ended
                      </span>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {event.description || 'No description available'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="h-4 w-4" />
                    <span>{problemCount} {problemCount === 1 ? 'Problem' : 'Problems'}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    asChild 
                    className="w-full" 
                    disabled={isEnded}
                  >
                    <Link to={`/event/${event.documentId}`}>
                      {isEnded ? 'Event Ended' : 'View Event'}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
