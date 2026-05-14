import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useParticipationHistory } from '../hooks/useParticipationHistory';
import ParticipationTable from './ParticipationTable';

export default function ParticipationHistoryCard() {
  const { history, isHistoryLoading } = useParticipationHistory();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participation History</CardTitle>
        <CardDescription>Events you registered for.</CardDescription>
      </CardHeader>
      <CardContent>
        {isHistoryLoading ? (
          <p className="text-sm text-muted-foreground">Loading participation history...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No participation records yet.</p>
        ) : (
          <ParticipationTable history={history} />
        )}
      </CardContent>
    </Card>
  );
}
