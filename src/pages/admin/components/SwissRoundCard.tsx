import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { Pairing, MatchResult } from '@/lib/tournament-engine';

interface Props {
  round: number;
  pairings: Pairing[];
  results?: MatchResult[];
  teamNameMap: Map<string, string>;
  bye?: string | null;
  revealedCount?: number;
  animated?: boolean;
  onMatchClick?: (team1Id: string, team2Id: string) => void;
}

export default function SwissRoundCard({
  round,
  pairings,
  results = [],
  teamNameMap,
  bye,
  revealedCount,
  animated = false,
  onMatchClick,
}: Props) {
  const showCount = revealedCount ?? results.length;

  function getResult(p: Pairing): MatchResult | undefined {
    return results.find(
      (r) =>
        (r.team1Id === p.team1Id && r.team2Id === p.team2Id) ||
        (r.team1Id === p.team2Id && r.team2Id === p.team1Id),
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-sm font-medium text-white">Runda {round}</span>
        {bye && (
          <span className="text-xs text-zinc-500">
            Bye: {teamNameMap.get(bye) ?? bye}
          </span>
        )}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_4.5rem_1fr] gap-2 px-4 py-2 border-b border-white/[0.04] text-xs text-zinc-600">
        <span>Lag 1</span>
        <span className="text-center">Poäng</span>
        <span className="text-right">Lag 2</span>
      </div>

      {/* Matches */}
      {pairings.map((p, i) => {
        const result = getResult(p);
        const revealed = i < showCount && result;

        const Wrapper = animated ? motion.div : 'div';
        const animProps = animated
          ? {
              initial: { opacity: 0, x: -12 },
              animate: revealed ? { opacity: 1, x: 0 } : { opacity: 0.4, x: 0 },
              transition: { duration: 0.3 },
            }
          : {};

        const t1Won = revealed && result!.winnerId === p.team1Id;
        const t2Won = revealed && result!.winnerId === p.team2Id;

        const rowContent = (
          <>
            <span
              className={cn(
                'truncate',
                t1Won ? 'text-emerald-400 font-medium' : revealed ? 'text-zinc-500' : 'text-white',
              )}
            >
              {teamNameMap.get(p.team1Id) ?? p.team1Id}
            </span>
            <span className="text-center font-mono text-zinc-400">
              {revealed
                ? `${result!.scoreTeam1}–${result!.scoreTeam2}`
                : '–'}
            </span>
            <span
              className={cn(
                'truncate text-right',
                t2Won ? 'text-emerald-400 font-medium' : revealed ? 'text-zinc-500' : 'text-white',
              )}
            >
              {teamNameMap.get(p.team2Id) ?? p.team2Id}
            </span>
          </>
        );

        return (
          <Wrapper
            key={`${p.team1Id}-${p.team2Id}`}
            {...animProps}
            className={cn(
              'grid grid-cols-[1fr_4.5rem_1fr] gap-2 px-4 py-2 border-b border-white/[0.04] last:border-0 text-sm',
              onMatchClick && 'cursor-pointer hover:bg-white/[0.03] transition-colors',
            )}
            {...(onMatchClick ? { onClick: () => onMatchClick(p.team1Id, p.team2Id), role: 'button' } : {})}
          >
            {rowContent}
          </Wrapper>
        );
      })}
    </div>
  );
}
