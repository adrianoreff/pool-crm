export function formatDoneAgo(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return 'done just now';

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  const weeks = Math.floor(days / 7);

  if (minutes < 60) return minutes <= 1 ? 'done just now' : `done ${minutes}m ago`;
  if (hours < 24) return `done ${hours}h ago`;
  if (days < 7) return `done ${days}d ago`;
  if (weeks < 5) return `done ${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `done ${months}mo ago`;
  return `done ${Math.floor(days / 365)}y ago`;
}
