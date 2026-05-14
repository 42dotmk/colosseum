import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function BackButton({isTrainingMode}: {isTrainingMode: boolean}) {
  return (
    <Button variant="ghost" size="icon" asChild className="-ml-2">
      <Link to={isTrainingMode ? '/training' : '/'}>
        <ArrowLeft className="h-4 w-4" />
      </Link>
    </Button>
  )
}