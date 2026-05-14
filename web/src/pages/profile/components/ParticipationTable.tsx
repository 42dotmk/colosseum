import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ParticipationEvent, ParticipationRecord } from '../types/Profile';

const getEventState = (event?: ParticipationEvent) => {
  if (!event?.start || !event?.end) {
    return 'Unknown';
  }

  const now = Date.now();
  const start = new Date(event.start).getTime();
  const end = new Date(event.end).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 'Unknown';
  }

  if (now < start) {
    return 'Upcoming';
  }

  if (now > end) {
    return 'Finished';
  }

  return 'Live';
};

export default function ParticipationTable({ history }: { history: ParticipationRecord[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Registered</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.documentId}>
              <TableCell>
                {entry.event?.documentId ? (
                  <Link className="text-primary hover:underline" to={`/event/${entry.event.documentId}`}>
                    {entry.event?.title || 'Untitled event'}
                  </Link>
                ) : (
                  <span>{entry.event?.title || 'Untitled event'}</span>
                )}
              </TableCell>
              <TableCell>{getEventState(entry.event)}</TableCell>
              <TableCell>
                {entry.registeredAt
                  ? new Date(entry.registeredAt).toLocaleString()
                  : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
