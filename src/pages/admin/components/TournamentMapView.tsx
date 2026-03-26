import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type {
  MatchResult,
  TeamStanding,
  KnockoutBracket as KnockoutBracketType,
} from '@/lib/tournament-engine';
import type { Match } from '@/lib/database.types';
import { dbMatchToResult } from '../lib/match-utils';
import KnockoutBracketView from './KnockoutBracketView';

interface TournamentMapViewProps {
  rounds: [number, Match[]][];
  standings: TeamStanding[];
  teamNameMap: Map<string, string>;
  liveBracket: KnockoutBracketType | null;
  knockoutResults: MatchResult[];
  champion: string | null;
  totalRounds: number;
  status: string;
  onEditMatch?: (matchId: string) => void;
  large?: boolean;
  currentRound?: number;
}

function MatchRow({
  match,
  teamNameMap,
  onEditMatch,
  large,
}: {
  match: Match;
  teamNameMap: Map<string, string>;
  onEditMatch?: (matchId: string) => void;
  large?: boolean;
}) {
  const result = dbMatchToResult(match);
  const t1Name = teamNameMap.get(match.team1_id) ?? '?';
  const t2Name = teamNameMap.get(match.team2_id) ?? '?';
  const isPending = !!match.winner_id && !match.confirmed;

  const textClass = large ? 'text-xs leading-5' : 'text-[11px] leading-[18px]';

  // Not played yet
  if (!result) {
    if (large) {
      return (
        <div className={cn(textClass, 'grid grid-cols-[1fr_auto_1fr] gap-2 w-full text-zinc-600')}>
          <span>{t1Name}</span>
          <span className="text-center font-mono">–</span>
          <span className="text-right">{t2Name}</span>
        </div>
      );
    }
    return (
      <div className={cn(textClass, 'text-zinc-600 truncate')}>
        {t1Name} – {t2Name}
      </div>
    );
  }

  const t1Won = result.winnerId === match.team1_id;
  const score1 = result.team1Id === match.team1_id ? result.scoreTeam1 : result.scoreTeam2;
  const score2 = result.team1Id === match.team1_id ? result.scoreTeam2 : result.scoreTeam1;

  const content = large ? (
    <div
      className={cn(
        textClass,
        'grid grid-cols-[1fr_auto_1fr] gap-2 w-full',
        isPending && 'border-l-2 border-amber-400/60 pl-1 -ml-1',
      )}
    >
      <span className={cn('flex items-center gap-1', t1Won ? 'text-emerald-400 font-medium' : 'text-zinc-600')}>
        {isPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
        {t1Name}
      </span>
      <span className="text-center text-zinc-600 font-mono">
        {score1}–{score2}
      </span>
      <span className={cn('text-right', !t1Won ? 'text-emerald-400 font-medium' : 'text-zinc-600')}>
        {t2Name}
      </span>
    </div>
  ) : (
    <div
      className={cn(
        textClass,
        'flex items-center gap-1 truncate',
        isPending && 'border-l-2 border-amber-400/60 pl-1 -ml-1',
      )}
    >
      {isPending && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
      )}
      <span className={t1Won ? 'text-emerald-400 font-medium' : 'text-zinc-600'}>
        {t1Name}
      </span>
      <span className="text-zinc-600 font-mono mx-0.5">
        {score1}–{score2}
      </span>
      <span className={!t1Won ? 'text-emerald-400 font-medium' : 'text-zinc-600'}>
        {t2Name}
      </span>
    </div>
  );

  if (isPending && onEditMatch) {
    return (
      <button
        onClick={() => onEditMatch(match.id)}
        className="w-full text-left hover:bg-amber-500/[0.06] rounded transition-colors -mx-0.5 px-0.5"
      >
        {content}
      </button>
    );
  }

  return content;
}

function RoundColumn({
  round,
  matches,
  teamNameMap,
  dimmed,
  onEditMatch,
  large,
  currentRound,
}: {
  round: number;
  matches: Match[];
  teamNameMap: Map<string, string>;
  dimmed: boolean;
  onEditMatch?: (matchId: string) => void;
  large?: boolean;
  currentRound?: number;
}) {
  const unconfirmedCount = matches.filter(
    (m) => m.winner_id && !m.confirmed,
  ).length;

  // Per-column progress
  let colProgress = 0;
  if (currentRound != null && currentRound > 0 && matches.length > 0) {
    if (round < currentRound) {
      colProgress = 100;
    } else if (round === currentRound) {
      const confirmed = matches.filter((m) => m.confirmed).length;
      colProgress = (confirmed / matches.length) * 100;
    }
  }
  const showProgress = currentRound != null && currentRound > 0;

  return (
    <div className={cn('flex-shrink-0 flex flex-col', large ? 'w-max min-w-48' : 'w-48')}>
      {showProgress && (
        <div className="h-1.5 rounded-full bg-white/[0.06] mb-1 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand-500"
            initial={{ width: 0 }}
            animate={{ width: `${colProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
      <div
        className={cn(
          'rounded-xl border overflow-hidden flex flex-col flex-1',
          dimmed
            ? 'border-white/[0.04] bg-white/[0.01] opacity-40'
            : 'border-white/[0.08] bg-white/[0.03]',
        )}
      >
      <div className="px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.02] flex items-baseline justify-between">
        <div>
          <span className={cn('font-medium text-zinc-400', large ? 'text-sm' : 'text-xs')}>
            R{round}
          </span>
          <span className={cn('text-zinc-600 ml-2', large ? 'text-xs' : 'text-[10px]')}>
            {matches.length} matcher
          </span>
        </div>
        {unconfirmedCount > 0 && (
          <span className={cn('text-amber-400', large ? 'text-xs' : 'text-[10px]')}>
            {unconfirmedCount} ej bekräftade
          </span>
        )}
      </div>
      <div className={cn('px-2 py-1.5', large ? 'flex-1 flex flex-col' : 'space-y-px')}>
        {matches.length > 0 ? (
          matches.map((m) => (
            <div key={m.id} className={cn(large && 'flex-1 flex items-center')}>
              <MatchRow
                match={m}
                teamNameMap={teamNameMap}
                onEditMatch={onEditMatch}
                large={large}
              />
            </div>
          ))
        ) : (
          <div className={cn('text-zinc-700 py-2 text-center', large ? 'text-sm' : 'text-[11px]')}>
            Ej lottad
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

function StandingsColumn({
  standings,
  highlightTop,
  large,
}: {
  standings: TeamStanding[];
  highlightTop: number;
  large?: boolean;
}) {
  if (standings.length === 0) return null;

  return (
    <div
      className={cn(
        'flex-shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden',
        large ? 'w-56' : 'w-44',
      )}
    >
      <div className="px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
        <span className={cn('font-medium text-zinc-400', large ? 'text-sm' : 'text-xs')}>
          Ställning
        </span>
      </div>
      <div className="px-2 py-1">
        {standings.map((s) => {
          const inPlayoff = s.rank <= highlightTop;
          return (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-1.5',
                large ? 'text-xs leading-5' : 'text-[11px] leading-[18px]',
                inPlayoff && 'bg-emerald-500/[0.04]',
              )}
            >
              <span
                className={cn(
                  'text-right font-mono',
                  large ? 'w-5' : 'w-4',
                  inPlayoff ? 'text-emerald-400' : 'text-zinc-700',
                )}
              >
                {s.rank}
              </span>
              <span className="truncate text-zinc-300 flex-1">{s.name}</span>
              <span className={cn('text-zinc-600 font-mono text-right', large ? 'w-8' : 'w-6')}>
                {s.wins}-{s.losses}
              </span>
              {inPlayoff && <span className={cn('text-emerald-500', large ? 'text-[10px]' : 'text-[9px]')}>*</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TournamentMapView({
  rounds,
  standings,
  teamNameMap,
  liveBracket,
  knockoutResults,
  champion,
  totalRounds,
  status,
  onEditMatch,
  large,
  currentRound,
}: TournamentMapViewProps) {
  // Build round data for all Swiss rounds (1..totalRounds), filling empties
  const swissRounds = rounds.filter(([r]) => r <= totalRounds);
  const roundMap = new Map(swissRounds);

  const allSwissRounds: [number, Match[]][] = [];
  for (let r = 1; r <= totalRounds; r++) {
    allSwissRounds.push([r, roundMap.get(r) ?? []]);
  }

  const hasSwiss = swissRounds.length > 0;
  const hasKnockout = status === 'knockout' || status === 'finished';


  return (
    <div className={cn(large ? 'flex flex-col h-full' : 'space-y-6')}>
      {/* Swiss section */}
      {(hasSwiss || standings.length > 0) && (
        <div className={cn('space-y-3', large && 'flex flex-col flex-1 min-h-0')}>
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Swiss-rundor
          </h3>
          <div className={cn('flex gap-2', large ? 'items-stretch flex-1 min-h-0' : 'items-start')}>
            <div className={cn('overflow-x-auto pb-2 flex-1 min-w-0', large && 'h-full')}>
              <div className={cn('flex gap-2', large ? 'items-stretch h-full' : 'items-start')}>
                  {allSwissRounds.map(([round, roundMatches]) => (
                    <RoundColumn
                      key={round}
                      round={round}
                      matches={roundMatches}
                      teamNameMap={teamNameMap}
                      dimmed={roundMatches.length === 0}
                      onEditMatch={onEditMatch}
                      large={large}
                      currentRound={currentRound}
                    />
                  ))}
              </div>
            </div>
            <StandingsColumn standings={standings} highlightTop={8} large={large} />
          </div>
        </div>
      )}

      {/* Divider */}
      {hasKnockout && hasSwiss && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
          <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-[0.2em]">
            Slutspel
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
        </div>
      )}

      {/* Knockout section */}
      {liveBracket && (
        <KnockoutBracketView
          bracket={liveBracket}
          teamNameMap={teamNameMap}
          results={knockoutResults}
          champion={champion}
        />
      )}

      {/* Empty state */}
      {!hasSwiss && standings.length === 0 && !liveBracket && (
        <div className="text-center py-12 text-zinc-700">
          <p className="text-sm">Turneringen har inte startat ännu</p>
        </div>
      )}
    </div>
  );
}
