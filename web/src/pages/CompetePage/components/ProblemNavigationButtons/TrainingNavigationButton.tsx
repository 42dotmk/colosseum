import { Button } from "@/components/ui/button";
import { EventProblem } from "../../types/EventProblem";
import { useNavigate } from "react-router-dom";

export default function TrainingNavigationButton({ problem, text, symbol }: { problem: EventProblem, text:string, symbol: string }) {
  const navigate = useNavigate();

  return (
    <>
      {problem ? (
        <Button
          variant="outline"
          className="w-72 justify-start overflow-hidden"
          onClick={() =>
            navigate(`/compete/${problem.documentId}?mode=training`)
          }
        >
          <span className="mr-2 shrink-0">{symbol}</span>
          <span className="truncate">
            {text}: {problem.title}
          </span>
        </Button>
      ) : (
        <div className="w-72" />
      )}
    </>
  )
}