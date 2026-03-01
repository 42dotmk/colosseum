import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { REST_URL } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

interface ParticipationEvent {
  documentId: string;
  title: string;
  start?: string;
  end?: string;
}

interface ParticipationRecord {
  documentId: string;
  registeredAt?: string;
  event?: ParticipationEvent;
}

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

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ParticipationRecord[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setUsername(user.username || '');
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const token = localStorage.getItem('jwt');
        const url = `${REST_URL}/event-registrations?populate[event][fields][0]=documentId&populate[event][fields][1]=title&populate[event][fields][2]=start&populate[event][fields][3]=end&sort=registeredAt:desc`;

        const response = await fetch(url, {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!response.ok) {
          setHistory([]);
          return;
        }

        const data = await response.json();
        const records = Array.isArray(data) ? data : (data.data || []);
        setHistory(records);
      } catch (err) {
        console.error('Failed to load participation history:', err);
        setHistory([]);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const avatarFallback = useMemo(() => {
    if (!username) {
      return 'U';
    }
    return username.substring(0, 2).toUpperCase();
  }, [username]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">You are not logged in.</p>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('jwt');

      let savedUsername = user.username;
      if (username.trim() && username.trim() !== user.username && typeof user.id === 'number') {
        const response = await fetch(`${REST_URL}/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            username: username.trim(),
            email: user.email,
          }),
        });

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(errorPayload?.error?.message || errorPayload?.message || 'Failed to update username');
        }

        const updated = await response.json();
        savedUsername = updated?.username || username.trim();
      }

      updateUser({
        username: savedUsername,
        avatarUrl: avatarUrl.trim(),
      });

      toast({
        title: 'Profile updated',
        description: 'Your profile changes were saved.',
      });
    } catch (err) {
      toast({
        title: 'Failed to save profile',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and see your event participation history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Edit your username and avatar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={avatarUrl} alt={username} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{username || user.username}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
