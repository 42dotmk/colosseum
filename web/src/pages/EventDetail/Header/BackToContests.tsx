import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function BackToContests() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to contests
    </Link>
  )
}