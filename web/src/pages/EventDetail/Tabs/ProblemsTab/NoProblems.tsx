import { FileText } from "lucide-react";

export default function NoProblems({ isUpcoming }: { isUpcoming: boolean }) {
  return (
    <div className="text-center py-16 border rounded-lg">
      <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
      <h3 className="font-medium mb-1">No problems yet</h3>
      <p className="text-sm text-muted-foreground">
        {isUpcoming ? 'Problems will be revealed when the contest starts' : 'No problems have been added to this contest'}
      </p>
    </div>
  )
}