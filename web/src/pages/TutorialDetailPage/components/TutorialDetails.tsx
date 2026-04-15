import ReadTime from "./ReadTime";
import TutorialSummary from "./TutorialSummary";
import RelatedProblem from "./RelatedProblem";

interface TutorialDetailsProps{
    title: string;
    readTimeMinutes:number;
    summary?: string;
    relatedProblem?: {
        documentId: string;
        title?: string;    
    };
}

const TutorialDetails = ({title, readTimeMinutes, relatedProblem, summary} : TutorialDetailsProps) => {
    return(
        <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                <ReadTime minutes={readTimeMinutes}/>
                <RelatedProblem documentId={relatedProblem?.documentId} title={relatedProblem?.title}/>
            </div>
            <TutorialSummary summary={summary}/>
        </div>
    );
}

export default TutorialDetails;