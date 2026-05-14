import { useAuth } from '@/contexts/AuthContext';
import ProfileHeader from './components/ProfileHeader';
import AccountCard from './components/AccountCard';
import ParticipationHistoryCard from './components/ParticipationHistoryCard';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">You are not logged in.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ProfileHeader />
      <AccountCard />
      <ParticipationHistoryCard />
    </div>
  );
}
