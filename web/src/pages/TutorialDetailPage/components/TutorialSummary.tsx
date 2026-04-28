interface TutorialSummaryProps {
    summary?:string;
}

const TutorialSummary = ({summary}:TutorialSummaryProps) => {
    if(!summary)
        return null;
    return(
        <p className="text-sm text-muted-foreground mt-3">{summary}</p>
    );
}

export default TutorialSummary;