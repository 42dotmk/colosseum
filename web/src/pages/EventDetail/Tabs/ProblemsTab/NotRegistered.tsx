import { FileText } from "lucide-react";

export default function NotRegistered() {
  return (
    <div className="text-center py-16 border rounded-lg">
      <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-medium mb-1">Registration required</h3>
      <p className="text-sm text-muted-foreground">
        Register for this event to access and solve problems.
      </p>
    </div>
  )
}