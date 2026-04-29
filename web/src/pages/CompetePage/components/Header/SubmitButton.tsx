import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

type SubmitButtonProps = {
  handleSubmit: () => Promise<void>,
  isSubmitting: boolean,
  isViewMode: boolean
}

export default function SubmitButton({handleSubmit, isSubmitting, isViewMode}: SubmitButtonProps) {
  return (
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> cfe1066 (fixed some of the comments)
    <Button onClick={handleSubmit} disabled={isSubmitting || isViewMode} size="sm">
      <Play className="mr-1.5 h-3.5 w-3.5" />
      {isViewMode ? 'View only' : (isSubmitting ? 'Running...' : 'Run')}
    </Button>
<<<<<<< HEAD
=======
    <>
      <Button onClick={handleSubmit} disabled={isSubmitting || isViewMode} size="sm">
        <Play className="mr-1.5 h-3.5 w-3.5" />
        {isViewMode ? 'View only' : (isSubmitting ? 'Running...' : 'Run')}
      </Button>
    </>
>>>>>>> def93e2 (Refactored to Header, Left Panel and Right Panel. Still much work to be done)
=======
>>>>>>> cfe1066 (fixed some of the comments)
  )
}