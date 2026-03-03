import { useEffect, useState } from 'react';
import { REST_URL } from '@/config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy } from 'lucide-react';

interface TrainingLeaderboardRow {
  rank: number;
  user: {
    documentId: string;
    displayName: string;
  };
  solvedCount: number;
  totalTime: number;
}

interface TrainingLeaderboardResponse {
  totals: {
    problems: number;
  };
  leaderboard: TrainingLeaderboardRow[];
}

export default function TrainingLeaderboardPage() {
  const [data, setData] = useState<TrainingLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events/training-leaderboard`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const payload = await response.json();
        setData(payload);
      } catch (err) {
        console.error('Failed to load training leaderboard:', err);
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Training Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ranked by solved training problems from past events.
        </p>
      </div>

      {!data || data.leaderboard.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No training solutions yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16 text-center">#</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead className="w-40 text-center">Solved</TableHead>
                {/* <TableHead className="w-40 text-center">Total Time</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.leaderboard.map((row) => (
                <TableRow key={row.user.documentId}>
                  <TableCell className="text-center font-mono">{row.rank}</TableCell>
                  <TableCell className="font-medium">{row.user.displayName}</TableCell>
                  <TableCell className="text-center font-mono">
                    {row.solvedCount}/{data.totals.problems}
                  </TableCell>
                  {/* <TableCell className="text-center font-mono">{row.totalTime.toFixed(2)}ms</TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
