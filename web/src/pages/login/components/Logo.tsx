import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';

export default function Logo() {    
  return (
    <div className="flex justify-center mb-8">
      <Link to="/" className="flex items-center gap-2">
        <Terminal className="h-8 w-8 text-primary" />
        <span className="text-2xl font-semibold tracking-tight">Colosseum</span>
      </Link>
    </div>
  );
}