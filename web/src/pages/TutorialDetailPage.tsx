import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { REST_URL, SENATUS_URL } from '@/config';
import Markdown from '@/components/Markdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock3 } from 'lucide-react';

interface TutorialDetail {
  documentId: string;
  title: string;
  summary?: string;
  content: string;
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

const resolveThumbnail = (tutorial?: TutorialDetail | null) => {
  if (!tutorial) {
    return '';
  }

  if (tutorial.thumbnail?.url) {
    if (tutorial.thumbnail.url.startsWith('http')) {
      return tutorial.thumbnail.url;
    }

    return `${SENATUS_URL}${tutorial.thumbnail.url}`;
  }

  return tutorial.thumbnailUrl || '';
};

export default function TutorialDetailPage() {
  const { tutorialId } = useParams();
  const [tutorial, setTutorial] = useState<TutorialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTutorial = async () => {
      if (!tutorialId) {
        setError('Tutorial not found');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('jwt');
        const params = new URLSearchParams();
        params.append('filters[documentId][$eq]', tutorialId);
        params.append('fields[0]', 'documentId');
        params.append('fields[1]', 'title');
        params.append('fields[2]', 'summary');
        params.append('fields[3]', 'content');
        params.append('fields[4]', 'readTimeMinutes');
        params.append('fields[5]', 'thumbnailUrl');
        params.append('populate[thumbnail][fields][0]', 'url');
        params.append('populate[relatedProblem][fields][0]', 'documentId');
        params.append('populate[relatedProblem][fields][1]', 'title');

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
        const first = entries[0] as TutorialDetail | undefined;

        if (!first) {
          setError('Tutorial not found');
          return;
        }

        setTutorial(first);
      } catch (err) {
        console.error('Failed to load tutorial:', err);
        setError('Failed to load tutorial');
      } finally {
        setLoading(false);
      }
    };

    fetchTutorial();
  }, [tutorialId]);

  const thumbnail = useMemo(() => resolveThumbnail(tutorial), [tutorial]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !tutorial) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/tutorials">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to tutorials
          </Link>
        </Button>
        <p className="text-destructive">{error || 'Tutorial not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link to="/tutorials">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to tutorials
        </Link>
      </Button>

      {thumbnail && (
        <img
          src={thumbnail}
          alt={tutorial.title}
          className="w-full h-64 object-cover rounded-lg border"
        />
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tutorial.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {tutorial.readTimeMinutes} min read
          </span>
          
          {tutorial.relatedProblem?.documentId && (
            <Badge variant="outline" className="text-[10px]">
              <Link to={`/compete/${tutorial.relatedProblem.documentId}`}>
                Related problem: {tutorial.relatedProblem.title || 'Open'}
              </Link>
            </Badge>
          )}
        </div>
        {tutorial.summary && (
          <p className="text-sm text-muted-foreground mt-3">{tutorial.summary}</p>
        )}
      </div>

      <div className="prose prose-sm prose-invert max-w-none">
        <Markdown content={tutorial.content || ''} />
      </div>
    </div>
  );
}
