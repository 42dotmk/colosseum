import useTutorials from './hooks/useTutorials';
import Title from './components/Title';
import TutorialList from './components/TutorialList';


export default function TutorialsPage() {
  const [tutorials, loading, error] = useTutorials();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Title />
      <TutorialList tutorials={tutorials} loading={loading} error={error} />
    </div>
  );
}
