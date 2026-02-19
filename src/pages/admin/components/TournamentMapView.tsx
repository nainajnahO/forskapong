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
}

function MatchRow({
  match,
  teamNameMap,
  onEditMatch,
}: {
  match: Match;
  teamNameMap: Map<string, string>;
  onEditMatch?: (matchId: string) => void;
}) {
  const result = dbMatchToResult(match);
  const t1Name = teamNameMap.get(match.team1_id) ?? '?';
  const t2Name = teamNameMap.get(match.team2_id) ?? '?';
  const isPending = !!match.winner_id && !match.confirmed;

  // Not played yet
  if (!result) {
    return (
      <div className="text-[11px] leading-[18px] text-zinc-600 truncate">
        {t1Name} – {t2Name}
      </div>
    );
  }

  const t1Won = result.winnerId === match.team1_id;
  const score1 = result.team1Id === match.team1_id ? result.scoreTeam1 : result.scoreTeam2;
  const score2 = result.team1Id === match.team1_id ? result.scoreTeam2 : result.scoreTeam1;

  const content = (
    <div
      className={cn(
        'text-[11px] leading-[18px] truncate flex items-center gap-1',
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
}: {
  round: number;
  matches: Match[];
  teamNameMap: Map<string, string>;
  dimmed: boolean;
  onEditMatch?: (matchId: string) => void;
}) {
  const unconfirmedCount = matches.filter(
    (m) => m.winner_id && !m.confirmed,
  ).length;

  return (
    <div
      className={cn(
        'flex-shrink-0 w-48 rounded-xl border overflow-hidden',
        dimmed
          ? 'border-white/[0.04] bg-white/[0.01] opacity-40'
          : 'border-white/[0.08] bg-white/[0.03]',
      )}
    >
      <div className="px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.02] flex items-baseline justify-between">
        <div>
          <span className="text-xs font-medium text-zinc-400">R{round}</span>
          <span className="text-[10px] text-zinc-600 ml-2">{matches.length} matcher</span>
        </div>
        {unconfirmedCount > 0 && (
          <span className="text-[10px] text-amber-400">
            {unconfirmedCount} ej bekräftade
          </span>
        )}
      </div>
      <div className="px-2 py-1.5 space-y-px">
        {matches.length > 0 ? (
          matches.map((m) => (
            <MatchRow
              key={m.id}
              match={m}
              teamNameMap={teamNameMap}
              onEditMatch={onEditMatch}
            />
          ))
        ) : (
          <div className="text-[11px] text-zinc-700 py-2 text-center">
            Ej lottad
          </div>
        )}
      </div>
    </div>
  );
}

function StandingsColumn({
  standings,
  highlightTop,
}: {
  standings: TeamStanding[];
  highlightTop: number;
}) {
  if (standings.length === 0) return null;

  return (
    <div className="flex-shrink-0 w-44 rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-xs font-medium text-zinc-400">Ställning</span>
      </div>
      <div className="px-2 py-1">
        {standings.map((s) => {
          const inPlayoff = s.rank <= highlightTop;
          return (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-1.5 text-[11px] leading-[18px]',
                inPlayoff && 'bg-emerald-500/[0.04]',
              )}
            >
              <span
                className={cn(
                  'w-4 text-right font-mono',
                  inPlayoff ? 'text-emerald-400' : 'text-zinc-700',
                )}
              >
                {s.rank}
              </span>
              <span className="truncate text-zinc-300 flex-1">{s.name}</span>
              <span className="text-zinc-600 font-mono w-6 text-right">
                {s.wins}-{s.losses}
              </span>
              {inPlayoff && <span className="text-emerald-500 text-[9px]">*</span>}
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
    <div className="space-y-6">
      {/* Swiss section */}
      {(hasSwiss || standings.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Swiss-rundor
          </h3>
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 items-start">
              {allSwissRounds.map(([round, roundMatches]) => (
                <RoundColumn
                  key={round}
                  round={round}
                  matches={roundMatches}
                  teamNameMap={teamNameMap}
                  dimmed={roundMatches.length === 0}
                  onEditMatch={onEditMatch}
                />
              ))}
              <StandingsColumn standings={standings} highlightTop={8} />
            </div>
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
