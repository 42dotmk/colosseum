import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileForm } from '../hooks/useProfileForm';
import AvatarPreview from './AvatarPreview';

export default function AccountCard() {
  const { user } = useAuth();
  const { username, setUsername, avatarUrl, setAvatarUrl, isSaving, avatarFallback, handleSave } = useProfileForm();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Edit your username and avatar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AvatarPreview
          avatarUrl={avatarUrl}
          username={username || user?.username || ''}
          email={user?.email}
          avatarFallback={avatarFallback}
        />

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
  );
}
