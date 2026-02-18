import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';
import type { Match, Team } from '@/lib/database.types';

type Theme = ReturnType<typeof useTheme>['theme'];

/* ─── Types ───────────────────────────────────────────────────── */

interface BracketMatch {
  id: string | null;
  stage: string;
  position: number;
  team1: { id: string; name: string } | null;
  team2: { id: string; name: string } | null;
  score1: number | null;
  score2: number | null;
  winnerId: string | null;
  confirmed: boolean;
  matchId: string | null;
}

interface BracketProps {
  matches: Match[];
  teams: Team[];
  currentTeamId?: string | null;
  onMatchClick?: (matchId: string) => void;
  compact?: boolean;
}

/* ─── Build bracket data ──────────────────────────────────────── */

function buildBracket(matches: Match[], teams: Team[]): BracketMatch[] {
  const teamMap = new Map(teams.map((t) => [t.id, { id: t.id, name: t.name }]));
  const playoffMatches = matches.filter((m) => m.is_playoff);

  const stages = ['quarterfinal', 'semifinal', 'final', 'third_place'];
  const positions: Record<string, number[]> = {
    quarterfinal: [1, 2, 3, 4],
    semifinal: [1, 2],
    final: [1],
    third_place: [1],
  };

  const bracket: BracketMatch[] = [];

  for (const stage of stages) {
    for (const pos of positions[stage] ?? []) {
      const match = playoffMatches.find(
        (m) => m.bracket_stage === stage && m.bracket_position === pos,
      );

      if (match) {
        bracket.push({
          id: match.id,
          stage,
          position: pos,
          team1: teamMap.get(match.team1_id) ?? null,
          team2: teamMap.get(match.team2_id) ?? null,
          score1: match.score_team1,
          score2: match.score_team2,
          winnerId: match.winner_id,
          confirmed: match.confirmed,
          matchId: match.id,
        });
      } else {
        bracket.push({
          id: null,
          stage,
          position: pos,
          team1: null,
          team2: null,
          score1: null,
          score2: null,
          winnerId: null,
          confirmed: false,
          matchId: null,
        });
      }
    }
  }

  return bracket;
}

/* ─── Match Card ──────────────────────────────────────────────── */

/* ─── Team Row ────────────────────────────────────────────────── */

function TeamRow({
  team,
  score,
  isWinner,
  isComplete,
  currentTeamId,
  theme,
}: {
  team: { id: string; name: string } | null;
  score: number | null;
  isWinner: boolean;
  isComplete: boolean;
  currentTeamId?: string | null;
  theme: Theme;
}) {
  const isMe = team?.id === currentTeamId;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-3 py-2 transition-colors',
        isWinner && isComplete
          ? theme === 'dark'
            ? 'bg-emerald-500/[0.08]'
            : 'bg-emerald-50/80'
          : '',
      )}
    >
      <span
        className={cn(
          'text-xs font-medium truncate flex-1',
          !team
            ? theme === 'dark'
              ? 'text-zinc-600 italic'
              : 'text-zinc-300 italic'
            : isMe
              ? 'text-brand-500 font-bold'
              : isWinner && isComplete
                ? theme === 'dark'
                  ? 'text-emerald-400 font-semibold'
                  : 'text-emerald-700 font-semibold'
                : isComplete
                  ? theme === 'dark'
                    ? 'text-zinc-500'
                    : 'text-zinc-400'
                  : 'text-foreground',
        )}
      >
        {team?.name ?? 'TBD'}
      </span>
      {score !== null && (
        <span
          className={cn(
            'text-xs font-mono font-bold w-5 text-center',
            isWinner
              ? theme === 'dark'
                ? 'text-emerald-400'
                : 'text-emerald-600'
              : theme === 'dark'
                ? 'text-zinc-500'
                : 'text-zinc-400',
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

/* ─── Match Card ──────────────────────────────────────────────── */

function MatchCard({
  match,
  theme,
  currentTeamId,
  onClick,
  compact,
}: {
  match: BracketMatch;
  theme: Theme;
  currentTeamId?: string | null;
  onClick?: () => void;
  compact?: boolean;
}) {
  const hasTeams = match.team1 && match.team2;
  const isComplete = match.winnerId !== null;
  const isClickable = hasTeams && onClick && match.matchId;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={cn(
        'rounded-lg border overflow-hidden transition-all',
        compact ? 'w-36 sm:w-44' : 'w-44 sm:w-52',
        isClickable && 'cursor-pointer hover:border-brand-500/50',
        theme === 'dark' ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-zinc-200',
        isComplete &&
          match.confirmed &&
          (theme === 'dark' ? 'border-emerald-500/20' : 'border-emerald-200'),
      )}
    >
      <TeamRow
        team={match.team1}
        score={match.score1}
        isWinner={match.winnerId === match.team1?.id}
        isComplete={isComplete}
        currentTeamId={currentTeamId}
        theme={theme}
      />
      <div className={cn('h-px', theme === 'dark' ? 'bg-white/[0.06]' : 'bg-zinc-100')} />
      <TeamRow
        team={match.team2}
        score={match.score2}
        isWinner={match.winnerId === match.team2?.id}
        isComplete={isComplete}
        currentTeamId={currentTeamId}
        theme={theme}
      />
    </div>
  );
}

/* ─── Bracket Component ───────────────────────────────────────── */

export default function Bracket({
  matches,
  teams,
  currentTeamId,
  onMatchClick,
  compact,
}: BracketProps) {
  const { theme } = useTheme();

  const bracket = buildBracket(matches, teams);

  const qf = bracket.filter((m) => m.stage === 'quarterfinal');
  const sf = bracket.filter((m) => m.stage === 'semifinal');
  const final = bracket.filter((m) => m.stage === 'final');
  const thirdPlace = bracket.filter((m) => m.stage === 'third_place');

  // Check if any playoff matches exist
  const hasPlayoffs = matches.some((m) => m.is_playoff);
  if (!hasPlayoffs) return null;

  const stages = [
    { label: 'Kvartsfinal', matches: qf },
    { label: 'Semifinal', matches: sf },
    { label: 'Final', matches: final },
  ];

  return (
    <div className="space-y-6">
      {/* Horizontal bracket layout */}
      <div className="overflow-x-auto pb-4">
        <div className="flex items-stretch gap-4 sm:gap-6 min-w-max px-1">
          {stages.map((stage, stageIdx) => (
            <motion.div
              key={stage.label}
              className="flex flex-col items-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: stageIdx * 0.1, duration: 0.4 }}
            >
              <p
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider mb-3',
                  themeText(theme, 'secondary'),
                )}
              >
                {stage.label}
              </p>
              <div
                className={cn(
                  'flex flex-col gap-3',
                  stage.label === 'Semifinal' && 'justify-around h-full',
                  stage.label === 'Final' && 'justify-center h-full',
                )}
              >
                {stage.matches.map((match) => (
                  <MatchCard
                    key={`${match.stage}-${match.position}`}
                    match={match}
                    theme={theme}
                    currentTeamId={currentTeamId}
                    onClick={match.matchId ? () => onMatchClick?.(match.matchId!) : undefined}
                    compact={compact}
                  />
                ))}
              </div>
            </motion.div>
          ))}

          {/* Champion */}
          {final[0]?.winnerId && (
            <motion.div
              className="flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <p
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider mb-3',
                  theme === 'dark' ? 'text-amber-400' : 'text-amber-600',
                )}
              >
                🏆 Mästare
              </p>
              <div
                className={cn(
                  'px-4 py-3 rounded-xl border-2 text-center',
                  theme === 'dark'
                    ? 'bg-amber-500/[0.08] border-amber-500/30'
                    : 'bg-amber-50 border-amber-300',
                )}
              >
                <p
                  className={cn(
                    'text-sm font-bold',
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-700',
                  )}
                >
                  {teams.find((t) => t.id === final[0].winnerId)?.name ?? '?'}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Third place match */}
      {thirdPlace.length > 0 && thirdPlace[0].team1 && (
        <div>
          <p
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wider mb-2',
              themeText(theme, 'secondary'),
            )}
          >
            Bronsmatch
          </p>
          <MatchCard
            match={thirdPlace[0]}
            theme={theme}
            currentTeamId={currentTeamId}
            onClick={
              thirdPlace[0].matchId ? () => onMatchClick?.(thirdPlace[0].matchId!) : undefined
            }
            compact={compact}
          />
        </div>
      )}
    </div>
  );
}
