import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

type SubmitButtonProps = {
  handleSubmit: () => Promise<void>,
  isSubmitting: boolean,
  isViewMode: boolean
}

export default function SubmitButton({handleSubmit, isSubmitting, isViewMode}: SubmitButtonProps) {
  return (
    <Button onClick={handleSubmit} disabled={isSubmitting || isViewMode} size="sm">
      <Play className="mr-1.5 h-3.5 w-3.5" />
      {isViewMode ? 'View only' : (isSubmitting ? 'Running...' : 'Run')}
    </Button>
  )
}