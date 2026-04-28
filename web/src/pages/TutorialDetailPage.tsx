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
    </div>
  );
}