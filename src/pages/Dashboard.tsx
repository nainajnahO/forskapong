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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* ── Header ──────────────────────────────────── */}
          <div className="mb-10">
            <div className="flex items-start justify-between gap-4">
              <h1 className="font-display text-4xl md:text-5xl text-brand-500 tracking-wider hdr-text-fill">
                {team.name}
              </h1>
              <span
                className={cn(
                  'text-[10px] font-mono tracking-widest mt-3 px-2 py-0.5 rounded border',
                  theme === 'dark'
                    ? 'text-zinc-600 border-white/[0.06]'
                    : 'text-zinc-400 border-zinc-200',
                )}
              >
                {code}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
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

          {/* ── Stats ──────────────────────────────────── */}
          <div className="flex items-end gap-8 mb-2">
            <div>
              <p className={cn('text-[10px] uppercase tracking-[0.15em] mb-1', themeText(theme, 'muted'))}>
                Vinster
              </p>
              <p className="text-3xl font-bold tabular-nums text-emerald-400">{wins}</p>
            </div>
            <div>
              <p className={cn('text-[10px] uppercase tracking-[0.15em] mb-1', themeText(theme, 'muted'))}>
                Förluster
              </p>
              <p className="text-3xl font-bold tabular-nums text-red-400">{losses}</p>
            </div>
            {totalPlayed > 0 && (
              <div className="ml-auto text-right">
                <p className={cn('text-[10px] uppercase tracking-[0.15em] mb-1', themeText(theme, 'muted'))}>
                  Vinst%
                </p>
                <p className={cn('text-3xl font-bold tabular-nums', themeText(theme, 'primary'))}>
                  {winRate}
                  <span className={cn('text-lg', themeText(theme, 'muted'))}>%</span>
                </p>
              </div>
            )}
          </div>

          {/* ── Win rate bar ────────────────────────────── */}
          {totalPlayed > 0 && (
            <div
              className={cn(
                'h-1 rounded-full overflow-hidden mb-10',
                theme === 'dark' ? 'bg-white/[0.06]' : 'bg-zinc-200',
              )}
            >
              <motion.div
                className="h-full rounded-full bg-brand-500"
                initial={{ width: 0 }}
                animate={{ width: `${winRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          )}
          {totalPlayed === 0 && <div className="mb-10" />}

          {/* ── Next match ─────────────────────────────── */}
          {nextMatch && (
            <motion.button
              onClick={() => navigate(`/play/match/${nextMatch.matchId}`)}
              className={cn(
                'w-full text-left mb-10 py-4 px-5 rounded-xl border-l-4 border-brand-500 transition-all',
                theme === 'dark'
                  ? 'bg-white/[0.03] hover:bg-white/[0.05]'
                  : 'bg-zinc-50 hover:bg-zinc-100',
              )}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div className="flex items-center gap-4">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500" />
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider mb-0.5',
                      theme === 'dark' ? 'text-brand-400' : 'text-brand-600',
                    )}
                  >
                    {nextMatch.needsConfirmation
                      ? 'Bekräfta resultat'
                      : `Nästa match — Runda ${nextMatch.round}`}
                  </p>
                  <p className="text-base font-medium text-foreground truncate">
                    vs {nextMatch.opponent}
                  </p>
                </div>
                <div className={cn('text-right text-xs shrink-0', themeText(theme, 'secondary'))}>
                  {nextMatch.time && <p>{nextMatch.time}</p>}
                  {nextMatch.table && <p>Bord {nextMatch.table}</p>}
                </div>
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn('shrink-0', themeText(theme, 'muted'))}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </motion.button>
          )}

          {/* ── Match schedule header ──────────────────── */}
          <div className="flex items-center justify-between mb-4">
            <p className={cn('text-[10px] uppercase tracking-[0.2em]', themeText(theme, 'muted'))}>
              Matchschema
            </p>
            <button
              onClick={() => navigate('/scoreboard')}
              className={cn(
                'text-xs transition-opacity hover:opacity-70',
                themeText(theme, 'secondary'),
              )}
            >
              Scoreboard →
            </button>
          </div>

          {/* ── Match list ─────────────────────────────── */}
          {rounds.length === 0 ? (
            <p className={cn('text-sm py-12 text-center', themeText(theme, 'secondary'))}>
              Inga matcher schemalagda ännu.
            </p>
          ) : (
            <div className="space-y-1">
              {rounds.map((round, i) => {
                const isCurrent = i === currentRoundIdx;
                const isPlayed = round.result !== null;
                const isWin = round.result === 'win';
                const isTbd = round.opponent === null;

                const leftBorder = isPlayed
                  ? isWin
                    ? 'border-l-2 border-l-emerald-500'
                    : 'border-l-2 border-l-red-500'
                  : isCurrent && !isTbd
                    ? 'border-l-2 border-l-brand-500'
                    : 'border-l-2 border-l-transparent';

                return (
                  <motion.div
                    key={round.matchId}
                    className={cn(
                      'flex items-center gap-4 py-3 px-4 rounded-lg transition-all',
                      leftBorder,
                      isCurrent && 'cursor-pointer',
                      isCurrent &&
                        (theme === 'dark'
                          ? 'bg-brand-500/[0.05]'
                          : 'bg-brand-50/60'),
                      !isCurrent && !isTbd &&
                        (theme === 'dark'
                          ? 'hover:bg-white/[0.02]'
                          : 'hover:bg-zinc-50'),
                      isTbd && 'opacity-35',
                    )}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: isTbd ? 0.35 : 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    onClick={
                      isCurrent ? () => navigate(`/play/match/${round.matchId}`) : undefined
                    }
                  >
                    {/* Round number */}
                    <span
                      className={cn(
                        'text-xs font-mono w-6 shrink-0 text-center',
                        isCurrent
                          ? theme === 'dark'
                            ? 'text-brand-400 font-bold'
                            : 'text-brand-600 font-bold'
                          : themeText(theme, 'muted'),
                      )}
                    >
                      {round.round}
                    </span>

                    {/* Live dot */}
                    {isCurrent && !isTbd && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                      </span>
                    )}

                    {/* Opponent */}
                    <span className={cn('text-sm flex-1 truncate', isCurrent && 'font-medium')}>
                      {isTbd ? (
                        <span className={themeText(theme, 'muted')}>TBD</span>
                      ) : (
                        <span className="text-foreground">{round.opponent}</span>
                      )}
                    </span>

                    {/* Meta */}
                    {!isTbd && (
                      <span
                        className={cn(
                          'hidden sm:flex items-center gap-3 text-[11px] font-mono shrink-0',
                          themeText(theme, 'muted'),
                        )}
                      >
                        {round.time && <span>{round.time}</span>}
                        {round.table && <span>B{round.table}</span>}
                      </span>
                    )}

                    {/* Score + result */}
                    <span className="shrink-0 flex items-center gap-2.5">
                      {isPlayed && round.scoreDisplay && (
                        <span className={cn('text-xs font-mono tabular-nums', themeText(theme, 'secondary'))}>
                          {round.scoreDisplay}
                        </span>
                      )}
                      {isPlayed ? (
                        <span
                          className={cn(
                            'text-[10px] font-black w-5 text-center uppercase',
                            isWin ? 'text-emerald-400' : 'text-red-400',
                          )}
                        >
                          {isWin ? 'W' : 'L'}
                        </span>
                      ) : round.needsConfirmation ? (
                        <span
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded',
                            theme === 'dark'
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-amber-600 bg-amber-50',
                          )}
                        >
                          Bekräfta
                        </span>
                      ) : !isTbd ? (
                        <span className={cn('text-xs', themeText(theme, 'muted'))}>—</span>
                      ) : null}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </Container>
    </section>
  );
}
