import { Badge } from "@/components/ui/badge";

export default function Title({problemTitle,isInteractiveProblem}: {problemTitle: string, isInteractiveProblem: boolean}){
  return (
    <>
      <h1 className="text-lg font-medium">
        {problemTitle}
      </h1>
      {isInteractiveProblem && (
        <Badge variant="secondary" className="h-5 text-[10px]">
          Interactive
        </Badge>
      )}
    </>
  )
}