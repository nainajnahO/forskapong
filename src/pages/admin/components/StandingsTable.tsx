import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { TeamStanding } from '@/lib/tournament-engine';

interface Props {
  standings: TeamStanding[];
  highlightTop?: number;
  compact?: boolean;
}

export default function StandingsTable({
  standings,
  highlightTop = 8,
  compact = false,
}: Props) {
  if (standings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          'grid gap-2 px-4 border-b border-white/[0.06] bg-white/[0.02]',
          compact
            ? 'grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem_3rem] py-2 text-xs'
            : 'grid-cols-[2.5rem_1fr_3rem_3rem_3.5rem_3.5rem] py-3 text-xs sm:text-sm',
        )}
      >
        <span className="text-zinc-500 text-center">#</span>
        <span className="text-zinc-500">Lag</span>
        <span className="text-zinc-500 text-center">V</span>
        <span className="text-zinc-500 text-center">F</span>
        <span className="text-zinc-500 text-center" title="Buchholz">BH</span>
        <span className="text-zinc-500 text-center">Cups</span>
      </div>

      {/* Rows */}
      {standings.map((s, i) => {
        const inPlayoff = s.rank <= highlightTop;
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
            className={cn(
              'grid gap-2 px-4 border-b border-white/[0.04] last:border-0',
              compact
                ? 'grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem_3rem] py-1.5 text-xs'
                : 'grid-cols-[2.5rem_1fr_3rem_3rem_3.5rem_3.5rem] py-2.5 text-sm',
              inPlayoff && 'bg-emerald-500/[0.04]',
            )}
          >
            <span
              className={cn(
                'text-center font-mono',
                inPlayoff ? 'text-emerald-400' : 'text-zinc-600',
              )}
            >
              {s.rank}
            </span>
            <span className="text-white truncate">{s.name}</span>
            <span className="text-emerald-400 text-center font-mono">{s.wins}</span>
            <span className="text-red-400 text-center font-mono">{s.losses}</span>
            <span className="text-zinc-400 text-center font-mono">{s.opponentWins}</span>
            <span className="text-zinc-400 text-center font-mono">{s.totalCupsHit}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
