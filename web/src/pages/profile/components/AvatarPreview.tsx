import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AvatarPreviewProps {
  avatarUrl: string;
  username: string;
  email?: string;
  avatarFallback: string;
}

export default function AvatarPreview({ avatarUrl, username, email, avatarFallback }: AvatarPreviewProps) {
  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-14 w-14">
        <AvatarImage src={avatarUrl} alt={username} />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium">{username}</p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  );
}
