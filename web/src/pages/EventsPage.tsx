import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { REST_URL } from "@/config";

interface Event {
  documentId: string;
  title: string;
  description: string;
  start: string;
  end: string;
  slug: string;
  problems?: any[];
  supportedLanguages?: any[];
  publishedAt: string;
}

function getTimeRemaining(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) {return "Started";}

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {return `${days}d ${hours}h`;}
  if (hours > 0) {return `${hours}h ${minutes}m`;}
  return `${minutes}m`;
}

function formatDuration(start: Date, end: Date): string {
  const diff = end.getTime() - start.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0 && minutes > 0) {return `${hours}h ${minutes}m`;}
  if (hours > 0) {return `${hours}h`;}
  return `${minutes}m`;
}

interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const response = await fetch(`${REST_URL}/events?populate=*`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const eventsData = Array.isArray(data) ? data : data.data || [];
        setEvents(eventsData);
      } catch (err) {
        console.error("Failed to load events:", err);
        setError("Failed to load events");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const now = new Date();
  const activeEvents = events.filter((e) => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    return now >= start && now <= end;
  });
  const upcomingEvents = events.filter((e) => new Date(e.start) > now);
  const pastEvents = events.filter((e) => new Date(e.end) < now);

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

  const EventCard = ({ event }: { event: Event }) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const isActive = now >= startDate && now <= endDate;
    const isUpcoming = startDate > now;
    const problemCount = event.problems?.length || 0;

    return (
      <Link to={`/event/${event.documentId}`} className="block group">
        <div className="border rounded-lg p-5 transition-all hover:border-primary/50 hover:bg-secondary/20">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                  {event.title}
                </h3>
                {isActive && (
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs text-emerald-500 font-medium">
                      LIVE
                    </span>
                  </span>
                )}
              </div>

              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {startDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDuration(startDate, endDate)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono">{problemCount}</span>
                  <span>{problemCount === 1 ? "problem" : "problems"}</span>
                </div>
              </div>

              {event.supportedLanguages &&
                event.supportedLanguages.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3">
                    {event.supportedLanguages.slice(0, 5).map((lang: any) => (
                      <Badge
                        key={lang.documentId}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-5 font-normal"
                      >
                        {lang.name}
                      </Badge>
                    ))}
                    {event.supportedLanguages.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{event.supportedLanguages.length - 5}
                      </span>
                    )}
                  </div>
                )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {isUpcoming && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Starts in</div>
                  <div className="font-mono text-sm font-medium text-primary">
                    {getTimeRemaining(startDate)}
                  </div>
                </div>
              )}
              {isActive && (
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Ends in</div>
                  <div className="font-mono text-sm font-medium text-amber-500">
                    {getTimeRemaining(endDate)}
                  </div>
                </div>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Contests</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compete in coding challenges and climb the leaderboard
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="active" className="gap-2">
            Active
            {activeEvents.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {activeEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            Upcoming
            {upcomingEvents.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {upcomingEvents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-0">
          {activeEvents.length === 0 ? (
            <EmptyState message="No active contests right now" />
          ) : (
            activeEvents.map((event) => (
              <EventCard key={event.documentId} event={event} />
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3 mt-0">
          {upcomingEvents.length === 0 ? (
            <EmptyState message="No upcoming contests scheduled" />
          ) : (
            upcomingEvents.map((event) => (
              <EventCard key={event.documentId} event={event} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 mt-0">
          {pastEvents.length === 0 ? (
            <EmptyState message="No past contests" />
          ) : (
            pastEvents.map((event) => (
              <EventCard key={event.documentId} event={event} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
