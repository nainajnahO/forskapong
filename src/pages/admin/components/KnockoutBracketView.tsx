import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { KnockoutBracket, MatchResult } from '@/lib/tournament-engine';

interface Props {
  bracket: KnockoutBracket;
  teamNameMap: Map<string, string>;
  results?: MatchResult[];
  champion?: string | null;
  animated?: boolean;
}

function MatchCard({
  team1Id,
  team2Id,
  teamNameMap,
  results,
  animated,
}: {
  team1Id: string | null;
  team2Id: string | null;
  teamNameMap: Map<string, string>;
  results: MatchResult[];
  animated: boolean;
}) {
  const result = results.find(
    (r) =>
      (r.team1Id === team1Id && r.team2Id === team2Id) ||
      (r.team1Id === team2Id && r.team2Id === team1Id),
  );

  const Wrapper = animated ? motion.div : 'div';
  const animProps = animated
    ? { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } }
    : {};

  return (
    <Wrapper
      {...animProps}
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden w-full"
    >
      <TeamRow
        teamId={team1Id}
        teamNameMap={teamNameMap}
        isWinner={result?.winnerId === team1Id}
        isLoser={result?.loserId === team1Id}
        score={
          result
            ? result.team1Id === team1Id
              ? result.scoreTeam1
              : result.scoreTeam2
            : null
        }
      />
      <div className="border-t border-white/[0.06]" />
      <TeamRow
        teamId={team2Id}
        teamNameMap={teamNameMap}
        isWinner={result?.winnerId === team2Id}
        isLoser={result?.loserId === team2Id}
        score={
          result
            ? result.team1Id === team2Id
              ? result.scoreTeam1
              : result.scoreTeam2
            : null
        }
      />
    </Wrapper>
  );
}

function TeamRow({
  teamId,
  teamNameMap,
  isWinner,
  isLoser,
  score,
}: {
  teamId: string | null;
  teamNameMap: Map<string, string>;
  isWinner: boolean;
  isLoser: boolean;
  score: number | null;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-1.5 text-xs',
        isWinner && 'bg-emerald-500/[0.06]',
      )}
    >
      <span
        className={cn(
          'truncate',
          isWinner
            ? 'text-emerald-400 font-medium'
            : isLoser
              ? 'text-zinc-600'
              : teamId
                ? 'text-white'
                : 'text-zinc-700',
        )}
      >
        {teamId ? (teamNameMap.get(teamId) ?? teamId) : 'TBD'}
      </span>
      {score !== null && (
        <span className="text-zinc-500 font-mono ml-2">{score}</span>
      )}
    </div>
  );
}

export default function KnockoutBracketView({
  bracket,
  teamNameMap,
  results = [],
  champion,
  animated = false,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Bracket grid: one column per knockout round, later rounds vertically centered */}
      <div
        className="grid gap-4 items-stretch"
        style={{ gridTemplateColumns: `repeat(${bracket.rounds.length}, minmax(0, 1fr))` }}
      >
        {bracket.rounds.map((round, ri) => (
          <div key={ri} className="space-y-3">
            <h4 className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              {bracket.labels[ri]}
            </h4>
            <div className="flex flex-col justify-around gap-3 h-full">
              {round.map((slot) => (
                <MatchCard
                  key={slot.matchIndex}
                  team1Id={slot.team1Id}
                  team2Id={slot.team2Id}
                  teamNameMap={teamNameMap}
                  results={results}
                  animated={animated}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Champion */}
      {champion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center py-8"
        >
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-2">
            Mästare
          </p>
          <p className="text-3xl font-bold text-emerald-400">
            {teamNameMap.get(champion) ?? champion}
          </p>
        </motion.div>
      )}
    </div>
  );
}
