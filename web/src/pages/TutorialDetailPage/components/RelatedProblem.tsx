import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface RelatedProblemProps{
    documentId?: string;
    title?: string;
}
const RelatedProblem = ({documentId, title} : RelatedProblemProps) => {
    if(!documentId)
        return null;
    return (
        <Badge variant="outline" className="text-[10px]">
            <Link to={`/compete/${documentId}`}>
                Related problem: {title || 'Open'}
            </Link>
        </Badge>
    );
}

export default RelatedProblem;