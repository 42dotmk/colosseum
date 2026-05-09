import BackToTutorialsButton from "./BackToTutorialsButton";

interface ErrorStateProps {
    error:string | null;
};

const ErrorState = ({error} : ErrorStateProps) => {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <BackToTutorialsButton/>
      <p className="text-destructive">{error || 'Tutorial not found'}</p>
    </div>
  );
} 

export default ErrorState;