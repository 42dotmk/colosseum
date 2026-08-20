import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { REST_URL, SENATUS_URL } from '@/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpenText, Clock3 } from 'lucide-react';

interface TutorialListItem {
  documentId: string;
  title: string;
  summary?: string;
  readTimeMinutes: number;
  thumbnailUrl?: string;
  thumbnail?: {
    url?: string;
  };
  relatedProblem?: {
    documentId: string;
    title?: string;
  };
}

const resolveThumbnail = (tutorial: TutorialListItem) => {
  if (tutorial.thumbnail?.url) {
    if (tutorial.thumbnail.url.startsWith('http')) {
      return tutorial.thumbnail.url;
    }

    return `${SENATUS_URL}${tutorial.thumbnail.url}`;
  }

  return tutorial.thumbnailUrl || '';
};

export default function TutorialsPage() {
  const [tutorials, setTutorials] = useState<TutorialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTutorials = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const params = new URLSearchParams();
        params.append('fields[0]', 'documentId');
        params.append('fields[1]', 'title');
        params.append('fields[2]', 'summary');
        params.append('fields[3]', 'readTimeMinutes');
        params.append('fields[4]', 'thumbnailUrl');
        params.append('populate[thumbnail][fields][0]', 'url');
        params.append('populate[relatedProblem][fields][0]', 'documentId');
        params.append('populate[relatedProblem][fields][1]', 'title');
        params.append('sort', 'publishedAt:desc');

        const response = await fetch(`${REST_URL}/tutorials?${params.toString()}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const payload = await response.json();
        const entries = Array.isArray(payload) ? payload : (payload.data || []);
        setTutorials(entries);
      } catch (err) {
        console.error('Failed to load tutorials:', err);
        setError('Failed to load tutorials');
      } finally {
        setLoading(false);
      }
    };

    fetchTutorials();
  }, []);

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
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tutorials</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Learn concepts, strategies, and task-specific solving walkthroughs.
        </p>
      </div>

      {tutorials.length === 0 ? (
        <div className="text-center py-16 border rounded-lg text-muted-foreground text-sm">
          No tutorials published yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {tutorials.map((tutorial) => {
            const thumbnail = resolveThumbnail(tutorial);
            return (
              <Card key={tutorial.documentId} className="overflow-hidden">
                <Link to={`/tutorials/${tutorial.documentId}`}>
                  <div className="grid md:grid-cols-[220px_1fr]">
                    <div className="bg-secondary/30">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={tutorial.title}
                          className="w-full h-44 md:h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-44 md:h-full flex items-center justify-center text-muted-foreground">
                          <BookOpenText className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-xl">{tutorial.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {tutorial.readTimeMinutes} min read
                          </span>
                          {tutorial.relatedProblem?.title && (
                            <Badge variant="outline" className="text-[10px]">
                              Related: {tutorial.relatedProblem.title}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {tutorial.summary || 'Open to read this tutorial.'}
                        </p>
                      </CardContent>
                    </div>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
