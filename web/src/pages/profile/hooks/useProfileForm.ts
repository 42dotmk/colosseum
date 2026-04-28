import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { REST_URL } from '@/config';

export const useProfileForm = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  const avatarFallback = useMemo(() => {
    if (!username) {
      return 'U';
    }
    return username.substring(0, 2).toUpperCase();
  }, [username]);

  const handleSave = async () => {
    if (!user) return;
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

  return {
    username,
    setUsername,
    avatarUrl,
    setAvatarUrl,
    isSaving,
    avatarFallback,
    handleSave,
  };
};
