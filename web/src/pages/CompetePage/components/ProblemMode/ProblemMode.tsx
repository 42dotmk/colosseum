import TrainingMode from "./TrainingMode";
import ViewMode from "./ViewMode";

export default function ProblemMode({ isTrainingMode, isViewMode }: { isTrainingMode: boolean, isViewMode: boolean }) {
  return (
    <>
      <ViewMode isViewMode={isViewMode} />
      <TrainingMode isTrainingMode={isTrainingMode} />
    </>

  )
}