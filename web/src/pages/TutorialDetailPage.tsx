import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import { resolveThumbnail } from './TutorialDetailPage/utils/resolveThumbnail';
import useTutorialDetail from './TutorialDetailPage/hooks/useTutorialDetail';

import BackToTutorialsButton from './TutorialDetailPage/components/BackToTutorialsButton';
import TutorialThumbnail from './TutorialDetailPage/components/TutorialThumbnail';
import TutorialContent from './TutorialDetailPage/components/TutorialContent';
import Loading from './TutorialDetailPage/components/Loading';
import ErrorState from './TutorialDetailPage/components/ErrorState';
import TutorialDetails from './TutorialDetailPage/components/TutorialDetails';

export default function TutorialDetailPage() {
  const { tutorialId } = useParams();
  const {tutorial, loading, error}=useTutorialDetail(tutorialId);

  const thumbnail = useMemo(() => resolveThumbnail(tutorial), [tutorial]);

  if (loading) {
    return <Loading/>;
  }

  if (error || !tutorial) {
    return <ErrorState error={error}/>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
<<<<<<< HEAD
      <BackToTutorialsButton/>
      <TutorialThumbnail 
        src={thumbnail} 
        alt={tutorial.title} 
        className="w-full h-64 object-cover rounded-lg border"
      />
      <TutorialDetails 
        title={tutorial.title} 
        readTimeMinutes={tutorial.readTimeMinutes} 
        summary={tutorial.summary} 
        relatedProblem={tutorial.relatedProblem}
      />
      <TutorialContent 
        content={tutorial.content} 
        className="prose prose-sm prose-invert max-w-none"
      />
=======
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
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
    </div>
  );
}