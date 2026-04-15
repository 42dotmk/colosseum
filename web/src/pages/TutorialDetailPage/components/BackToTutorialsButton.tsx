import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackToTutorialsButton= () =>
{
  return(
      <Button asChild variant="ghost" size="sm">
      <Link to="/tutorials">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to tutorials
      </Link>
    </Button>
  )
}

export default BackToTutorialsButton;