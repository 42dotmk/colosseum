import { EventProblem } from "../../types/EventProblem";
import TrainingNavigationButton from "./TrainingNavigationButton";

export default function TrainingNavigation({ previousProblem, nextProblem }: {
  previousProblem: EventProblem | null, nextProblem: EventProblem | null
}) {
<<<<<<< HEAD
<<<<<<< HEAD
=======
  console.log("ulave");

>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
=======
>>>>>>> cfe1066 (fixed some of the comments)
  return (
    <div className="mt-4 border-t px-4 py-4">
      <div className="grid grid-cols-[minmax(0,18rem)_auto_minmax(0,18rem)] items-center gap-3">
        <div className="flex justify-start">
          {previousProblem && <TrainingNavigationButton text="Previous" problem={previousProblem} symbol="←" />}
        </div>

        <div className="text-xs text-muted-foreground text-center whitespace-nowrap"></div>

        <div className="flex justify-end">
          {nextProblem && <TrainingNavigationButton text="Next" problem={nextProblem} symbol="→"  />}
        </div>
      </div>
    </div>
  );
}