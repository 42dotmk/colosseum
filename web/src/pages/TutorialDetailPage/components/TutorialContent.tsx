import Markdown from '@/components/Markdown';

interface TutorialContentProps {
    content:string;
    className:string;
}

const TutorialContent = ({content, className} : TutorialContentProps) => {
    return (
        <Markdown content={content || ''} className={className} />
    )
}

export default TutorialContent;