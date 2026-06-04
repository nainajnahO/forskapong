import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';
import type { RealtimeStatus } from '@/hooks/useRealtimeStatus';

interface RealtimeIndicatorProps {
  status: RealtimeStatus;
  /** Manual refetch — used when the live socket is down so viewers can pull fresh data. */
  onRefresh: () => void;
  theme: 'light' | 'dark';
  className?: string;
}

/**
 * Small chip showing a Supabase Realtime channel's state: a pulsing "Live" dot
 * when subscribed, "Ansluter…" while connecting, or a clickable "Uppdatera"
 * prompt when the socket drops (e.g. the free-tier connection cap) so viewers
 * aren't left staring at silently stale data.
 */
export default function RealtimeIndicator({
  status,
  onRefresh,
  theme,
  className,
}: RealtimeIndicatorProps) {
  if (status === 'live') {
    return (
      <div
        className={cn('flex items-center gap-1.5', className)}
        title="Live – uppdateras automatiskt"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className={cn('text-[10px]', themeText(theme, 'muted'))}>Live</span>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
        <span className={cn('text-[10px]', themeText(theme, 'muted'))}>Ansluter…</span>
      </div>
    );
  }

  return (
    <button
      onClick={onRefresh}
      title="Liveuppdateringar pausade – tryck för att hämta senaste"
      className={cn('flex items-center gap-1.5 transition-opacity hover:opacity-70', className)}
    >
      <span className="w-2 h-2 rounded-full bg-amber-400" />
      <span className="text-[10px] text-amber-400">Uppdatera</span>
    </button>
  );
}
