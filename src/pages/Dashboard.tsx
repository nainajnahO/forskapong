import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';

import { supabase } from '@/lib/supabase';
import type { Team, Match } from '@/lib/database.types';
import Container from '../components/common/Container';

/* ─── Types ───────────────────────────────────────────────────── */

interface MatchWithTeams extends Match {
  team1: Pick<Team, 'id' | 'name'>;
  team2: Pick<Team, 'id' | 'name'>;
}

interface RoundDisplay {
  round: number;
  matchId: string;
  time: string | null;
  table: number | null;
  opponent: string | null;
  opponentId: string | null;
  result: 'win' | 'loss' | null;
  scoreDisplay: string | null; // e.g. "3–1" formatted for display
  confirmed: boolean;
  needsConfirmation: boolean;
  canReport: boolean;
}

/* ─── Data fetching ───────────────────────────────────────────── */

async function fetchTeam(teamId: string) {
  const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();
  if (error) throw error;
  return data;
}

async function fetchMatches(teamId: string): Promise<MatchWithTeams[]> {
  // Fetch all matches for this team
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .order('round', { ascending: true });
  if (matchError) throw matchError;
  if (!matches || matches.length === 0) return [];

  // Collect all unique team IDs and fetch each individually
  const teamIds = [...new Set(matches.flatMap((m) => [m.team1_id, m.team2_id]))];

  const teamResults = await Promise.all(
    teamIds.map((id) => supabase.from('teams').select('id, name').eq('id', id).single()),
  );

  const teamMap = new Map<string, { id: string; name: string }>();
  for (const result of teamResults) {
    if (result.data) {
      teamMap.set(result.data.id, result.data);
    }
  }

  return matches.map((m) => ({
    ...m,
    team1: teamMap.get(m.team1_id) ?? { id: m.team1_id, name: 'Okänt lag' },
    team2: teamMap.get(m.team2_id) ?? { id: m.team2_id, name: 'Okänt lag' },
  })) as MatchWithTeams[];
}

function matchToRound(match: MatchWithTeams, teamId: string): RoundDisplay {
  const isTeam1 = match.team1_id === teamId;
  const opponent = isTeam1 ? match.team2 : match.team1;
  const isTbd = !opponent;

  let result: 'win' | 'loss' | null = null;
  if (match.winner_id === teamId) result = 'win';
  else if (match.loser_id === teamId) result = 'loss';

  // Loser needs to confirm if result reported but not confirmed, and we are the loser
  const needsConfirmation =
    match.loser_id === teamId && !match.confirmed && match.reported_by !== null;

  // Can report if no result yet and opponent is assigned
  const canReport = match.winner_id === null && !isTbd;

  // Format score from our perspective: our remaining – their remaining
  let scoreDisplay: string | null = null;
  if (match.score_team1 !== null && match.score_team2 !== null) {
    const ourScore = isTeam1 ? match.score_team1 : match.score_team2;
    const theirScore = isTeam1 ? match.score_team2 : match.score_team1;
    scoreDisplay = `${ourScore}–${theirScore}`;
  }

  return {
    round: match.round,
    matchId: match.id,
    time: match.scheduled_time,
    table: match.table_number,
    opponent: opponent?.name ?? null,
    opponentId: opponent?.id ?? null,
    result,
    scoreDisplay,
    confirmed: match.confirmed,
    needsConfirmation,
    canReport,
  };
}

/* ─── Player Name Input ──────────────────────────────────────── */

interface PlayerNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  theme: 'light' | 'dark';
}

function PlayerNameInput({
  value,
  onChange,
  onSave,
  placeholder,
  focused,
  onFocus,
  onBlur,
  theme,
}: PlayerNameInputProps): React.JSX.Element {
  const showOverlay = !value && !focused;

  return (
    <span className="inline-grid items-center">
      <span className="invisible text-sm col-start-1 row-start-1 whitespace-pre" aria-hidden>
        {value || placeholder + '|'}
      </span>
      <input
        type="text"
        size={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={() => { onBlur(); onSave(); }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        placeholder={placeholder}
        className={cn(
          'min-w-0 bg-transparent border-none px-0 py-0 text-sm outline-none placeholder:opacity-0 col-start-1 row-start-1',
          showOverlay && 'caret-transparent',
          themeText(theme, 'secondary'),
        )}
      />
      {showOverlay && (
        <span
          className={cn(
            'pointer-events-none col-start-1 row-start-1 flex items-center text-sm opacity-40',
            themeText(theme, 'secondary'),
          )}
          aria-hidden
        >
          {placeholder}<span className="animate-blink">|</span>
        </span>
      )}
    </span>
  );
}

/* ─── Dashboard Component ────────────────────────────────────── */

export default function Dashboard() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const teamId = sessionStorage.getItem('teamId');
  const code = sessionStorage.getItem('playCode');

  const [team, setTeam] = useState<Team | null>(null);
  const [rounds, setRounds] = useState<RoundDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [focusedField, setFocusedField] = useState<number | null>(null);
  const savingNamesRef = useRef(false);


  // Redirect if not logged in
  useEffect(() => {
    if (!teamId || !code) {
      navigate('/play', { replace: true });
    }
  }, [teamId, code, navigate]);

  // Fetch data
  const loadData = useCallback(async () => {
    if (!teamId) return;
    try {
      const [teamData, matchData] = await Promise.all([fetchTeam(teamId), fetchMatches(teamId)]);
      setTeam(teamData);
      setPlayer1(teamData.player1 ?? '');
      setPlayer2(teamData.player2 ?? '');
      setRounds(matchData.map((m) => matchToRound(m, teamId)));
      setError('');
    } catch {
      setError('Kunde inte ladda data. Försök igen.');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function savePlayerNames(): Promise<void> {
    if (!teamId || savingNamesRef.current) return;

    const trimmed = { player1: player1.trim() || null, player2: player2.trim() || null };
    savingNamesRef.current = true;
    try {
      const { error: saveError } = await supabase
        .from('teams')
        .update(trimmed)
        .eq('id', teamId);
      if (!saveError) {
        setTeam((prev) => (prev ? { ...prev, ...trimmed } : prev));
      }
    } finally {
      savingNamesRef.current = false;
    }
  }

  // Real-time subscription — re-fetch when matches change
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel('dashboard-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        // Re-fetch all data when any match changes
        loadData();
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` },
        () => {
          if (!savingNamesRef.current) loadData();
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [teamId, loadData]);

  if (!teamId || !code) return null;

  // Derived state — calculate from match data (source of truth)
  const currentRoundIdx = rounds.findIndex((r) => r.canReport || r.needsConfirmation);
  const nextMatch = currentRoundIdx !== -1 ? rounds[currentRoundIdx] : null;
  const wins = rounds.filter((r) => r.result === 'win').length;
  const losses = rounds.filter((r) => r.result === 'loss').length;
  const totalPlayed = wins + losses;
  const winRate = totalPlayed > 0 ? Math.round((wins / totalPlayed) * 100) : 0;

  /* ── Loading state ──────────────────────────────── */
  if (loading) {
    return (
      <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className={cn('text-sm', themeText(theme, 'secondary'))}>Laddar turnering…</p>
        </motion.div>
      </section>
    );
  }

  /* ── Error state ────────────────────────────────── */
  if (error || !team) {
    return (
      <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 flex items-center justify-center">
        <Container className="text-center">
          <p className="text-red-400 mb-4">{error || 'Kunde inte hitta laget.'}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg text-sm bg-brand-500 text-white"
          >
            Försök igen
          </button>
        </Container>
      </section>
    );
  }

  return (
    <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 md:pt-28 pb-10 md:pb-16">
      <Container>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* ── Header ──────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl text-brand-500 tracking-wider hdr-text-fill">
                {team.name}
              </h1>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <PlayerNameInput
                  value={player1}
                  onChange={setPlayer1}
                  onSave={savePlayerNames}
                  placeholder="Spelare 1"
                  focused={focusedField === 0}
                  onFocus={() => setFocusedField(0)}
                  onBlur={() => setFocusedField(null)}
                  theme={theme}
                />
                <span className={cn('text-sm', themeText(theme, 'secondary'))}>&</span>
                <PlayerNameInput
                  value={player2}
                  onChange={setPlayer2}
                  onSave={savePlayerNames}
                  placeholder="Spelare 2"
                  focused={focusedField === 1}
                  onFocus={() => setFocusedField(1)}
                  onBlur={() => setFocusedField(null)}
                  theme={theme}
                />
              </div>
            </div>
            <span
              className={cn(
                'text-[10px] font-mono tracking-wider mt-2',
                theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
              )}
            >
              {code}
            </span>
          </div>

          {/* ── Stats line ─────────────────────────────── */}
          <div className="flex items-center gap-5 mb-8 text-sm font-mono">
            <span className="text-emerald-400">{wins}W</span>
            <span className="text-red-400">{losses}L</span>
            {totalPlayed > 0 && (
              <span className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}>
                {winRate}%
              </span>
            )}
            <button
              onClick={() => navigate('/scoreboard')}
              className={cn(
                'ml-auto text-xs transition-opacity hover:opacity-70',
                themeText(theme, 'secondary'),
              )}
            >
              Scoreboard →
            </button>
          </div>

          {/* ── Next match ─────────────────────────────── */}
          {nextMatch && (
            <button
              onClick={() => navigate(`/play/match/${nextMatch.matchId}`)}
              className={cn(
                'w-full text-left mb-8 py-3 px-4 rounded-lg transition-colors',
                theme === 'dark'
                  ? 'bg-brand-500/[0.06] hover:bg-brand-500/[0.1]'
                  : 'bg-brand-50 hover:bg-brand-100',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                </span>
                <span
                  className={cn(
                    'text-xs font-medium uppercase tracking-wider',
                    theme === 'dark' ? 'text-brand-400' : 'text-brand-600',
                  )}
                >
                  {nextMatch.needsConfirmation
                    ? 'Bekräfta resultat'
                    : `R${nextMatch.round}`}
                </span>
                <span className="text-sm text-foreground">
                  vs {nextMatch.opponent}
                </span>
                <span className={cn('text-xs ml-auto', themeText(theme, 'secondary'))}>
                  {[
                    nextMatch.time,
                    nextMatch.table ? `Bord ${nextMatch.table}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            </button>
          )}

          {/* ── Divider ────────────────────────────────── */}
          <div
            className={cn(
              'h-px mb-6',
              theme === 'dark' ? 'bg-white/[0.06]' : 'bg-zinc-200',
            )}
          />

          {/* ── Match schedule ─────────────────────────── */}
          <p className={cn('text-[10px] uppercase tracking-[0.2em] mb-4', themeText(theme, 'muted'))}>
            Matchschema
          </p>

          {rounds.length === 0 ? (
            <p className={cn('text-sm py-8 text-center', themeText(theme, 'secondary'))}>
              Inga matcher schemalagda ännu.
            </p>
          ) : (
            <div
              className={cn(
                'divide-y',
                theme === 'dark' ? 'divide-white/[0.04]' : 'divide-zinc-100',
              )}
            >
              {rounds.map((round) => {
                const isCurrent = rounds.indexOf(round) === currentRoundIdx;
                const isPlayed = round.result !== null;
                const isWin = round.result === 'win';
                const isTbd = round.opponent === null;

                return (
                  <div
                    key={round.matchId}
                    className={cn(
                      'flex items-center gap-4 py-3 px-1 transition-colors',
                      isCurrent && 'cursor-pointer',
                      isCurrent &&
                        (theme === 'dark'
                          ? 'bg-brand-500/[0.04] -mx-3 px-4 rounded-lg'
                          : 'bg-brand-50/50 -mx-3 px-4 rounded-lg'),
                      isTbd && 'opacity-40',
                    )}
                    onClick={
                      isCurrent ? () => navigate(`/play/match/${round.matchId}`) : undefined
                    }
                  >
                    {/* Round number */}
                    <span
                      className={cn(
                        'text-xs font-mono w-6 shrink-0',
                        isCurrent
                          ? theme === 'dark'
                            ? 'text-brand-400'
                            : 'text-brand-600'
                          : theme === 'dark'
                            ? 'text-zinc-600'
                            : 'text-zinc-400',
                      )}
                    >
                      {round.round}
                    </span>

                    {/* Left accent for current */}
                    {isCurrent && !isTbd && (
                      <span className="relative flex h-1.5 w-1.5 shrink-0 -ml-2 mr-0.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-500" />
                      </span>
                    )}

                    {/* Opponent */}
                    <span className="text-sm flex-1 truncate">
                      {isTbd ? (
                        <span
                          className={cn(
                            'italic',
                            theme === 'dark' ? 'text-zinc-700' : 'text-zinc-400',
                          )}
                        >
                          TBD
                        </span>
                      ) : (
                        <span className="text-foreground">{round.opponent}</span>
                      )}
                    </span>

                    {/* Meta: time & table */}
                    {!isTbd && (
                      <span
                        className={cn(
                          'hidden sm:block text-[11px] font-mono',
                          theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
                        )}
                      >
                        {[
                          round.time,
                          round.table ? `B${round.table}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    )}

                    {/* Result */}
                    <span className="shrink-0 flex items-center gap-2">
                      {isPlayed && round.scoreDisplay && (
                        <span
                          className={cn(
                            'text-xs font-mono',
                            theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400',
                          )}
                        >
                          {round.scoreDisplay}
                        </span>
                      )}
                      {isPlayed ? (
                        <span
                          className={cn(
                            'text-[10px] font-bold w-5 text-center',
                            isWin ? 'text-emerald-400' : 'text-red-400',
                          )}
                        >
                          {isWin ? 'W' : 'L'}
                        </span>
                      ) : round.needsConfirmation ? (
                        <span
                          className={cn(
                            'text-[10px] font-semibold uppercase tracking-wider',
                            theme === 'dark' ? 'text-amber-400' : 'text-amber-600',
                          )}
                        >
                          Bekräfta
                        </span>
                      ) : !isTbd ? (
                        <span
                          className={cn(
                            'text-[10px]',
                            theme === 'dark' ? 'text-zinc-700' : 'text-zinc-300',
                          )}
                        >
                          —
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </Container>
    </section>
  );
}
