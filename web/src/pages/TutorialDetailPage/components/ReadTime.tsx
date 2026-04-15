import { Clock3 } from 'lucide-react';

interface ReadTimeProps{
    minutes:number;
}

const ReadTime = ({minutes} :ReadTimeProps) => {
    return (
        <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {minutes} min read
        </span>
    );
}

export default ReadTime;