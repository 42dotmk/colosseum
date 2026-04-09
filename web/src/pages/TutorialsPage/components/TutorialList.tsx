import type { TutorialListItem } from "../types/TutorialListItem";
import ErrorComponent from "./ErrorComponent";
import Loading from "./Loading";
import TutorialCard from "./TutorialCard";

export default function TutorialList({tutorials,loading, error}: {
  tutorials: TutorialListItem[], loading: boolean, error: string | null}){

  if (loading) {
    return <Loading />;
  }
  if (error){
    return <ErrorComponent error={error} />;
  }

  return (
    <>
      {tutorials.length === 0 ? (
        <div className="text-center py-16 border rounded-lg text-muted-foreground text-sm">
          No tutorials published yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {tutorials.map((tutorial) => {
            return <TutorialCard tutorial={tutorial} key={tutorial.documentId}/>
          })}
        </div>
      )}
    </>
  )
}