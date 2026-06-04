export function getTimeRemaining(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return '0:00:00';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function getDifficultyColor(difficulty?: string) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'text-emerald-500';
    case 'medium': return 'text-amber-500';
    case 'hard': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
}
