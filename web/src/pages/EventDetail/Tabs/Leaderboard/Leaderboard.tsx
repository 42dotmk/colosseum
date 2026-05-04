import { Table, TableBody, TableHeader } from "@/components/ui/table";
import { TabsContent } from "@/components/ui/tabs";
import LeaderboardRow from "./LeaderboardRow";
import { useEffect, useState } from "react";
import { LeaderboardResponse } from "../../types";
import { REST_URL } from "@/config";
import { Trophy } from "lucide-react";

type LeaderboardProps = {
  activeTab: string;
  eventId: string | undefined;
}

export default function Leaderboard({ activeTab, eventId }: LeaderboardProps) {
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);


  useEffect(() => {
    if (!eventId || activeTab !== 'leaderboard') {
      return;
    }

    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardError(null);

      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${REST_URL}/events/${eventId}/leaderboard`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setLeaderboard(data);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
        setLeaderboardError('Failed to load leaderboard');
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [eventId, activeTab]);


  return (
    <TabsContent value="leaderboard" className="mt-0">
      <div className="border rounded-lg overflow-hidden">
        {leaderboardLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
          </div>
        ) : leaderboardError ? (
          <div className="text-center py-16">
            <p className="text-sm text-destructive">{leaderboardError}</p>
          </div>
        ) : leaderboard && leaderboard.leaderboardAvailable === false ? (
          <div className="text-center py-16">
            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-medium mb-1">Leaderboard locked</h3>
            <p className="text-sm text-muted-foreground">
              Leaderboard will be available when the contest starts.
            </p>
          </div>
        ) : !leaderboard || leaderboard.leaderboard.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-medium mb-1">Leaderboard</h3>
            <p className="text-sm text-muted-foreground">
              Rankings will appear here once participants start solving problems
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader />
            <TableBody>
              {leaderboard.leaderboard.map((row) => (
                <LeaderboardRow key={row.user.documentId} row={row} />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </TabsContent>
  )
}