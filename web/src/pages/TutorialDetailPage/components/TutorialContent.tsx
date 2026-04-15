import Markdown from '@/components/Markdown';

interface TutorialContentProps{
    content:string;
    className:string;
}

const TutorialContent = ({content, className} : TutorialContentProps) => {
    return (
        <div className={className}>
            <Markdown content={content || ''} />
        </div>
    )
}

export default TutorialContent;