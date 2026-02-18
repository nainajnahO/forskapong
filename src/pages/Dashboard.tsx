import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText, themeGradientLine } from '@/lib/theme-utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match } from '@/lib/database.types';
import Container from '../components/common/Container';
import SectionLabel from '../components/common/SectionLabel';

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

/* ─── Icons ───────────────────────────────────────────────────── */

const iconBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function ClockIcon() {
  return (
    <svg width={14} height={14} {...iconBase}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width={14} height={14} {...iconBase}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
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
  const isInView = true; // Always animate (page load, not scroll section)

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

  const cardBg = theme === 'dark' ? 'bg-white/[0.03]' : 'bg-zinc-50';
  const cardBorder = theme === 'dark' ? 'border-white/[0.06]' : 'border-zinc-200';

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
        <div>
          {/* ── Sticky Next Match Banner ────────────────── */}
          {nextMatch && (
            <motion.button
              onClick={() => navigate(`/play/match/${nextMatch.matchId}`)}
              className={cn(
                'w-full rounded-2xl p-4 sm:p-5 border mb-8 text-left transition-all duration-500 cursor-pointer',
                'hover:border-brand-500/50',
                theme === 'dark'
                  ? 'bg-brand-500/[0.06] border-brand-500/30'
                  : 'bg-brand-50 border-brand-200',
              )}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500" />
                    </span>
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-xs font-semibold uppercase tracking-wider mb-1',
                        theme === 'dark' ? 'text-brand-400' : 'text-brand-600',
                      )}
                    >
                      {nextMatch.needsConfirmation
                        ? 'Bekräfta resultat'
                        : `Nästa match — Runda ${nextMatch.round}`}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      {nextMatch.time && (
                        <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                          <ClockIcon />
                          {nextMatch.time}
                        </span>
                      )}
                      {nextMatch.table && (
                        <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                          <TableIcon />
                          Bord {nextMatch.table}
                        </span>
                      )}
                      {nextMatch.opponent && (
                        <span className={themeText(theme, 'secondary')}>
                          vs {nextMatch.opponent}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={theme === 'dark' ? 'text-brand-400' : 'text-brand-600'}
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </motion.button>
          )}

          {/* ── Header ──────────────────────────────────── */}
          <motion.div
            className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div>
              <SectionLabel variant="gradient">TURNERING</SectionLabel>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-brand-500 tracking-wider hdr-text-fill">
                  {team.name}
                </h1>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-semibold tracking-wider border',
                    theme === 'dark'
                      ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                      : 'bg-brand-50 text-brand-600 border-brand-200',
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
            <div className="flex items-center gap-2 self-start">
              <button
                onClick={() => navigate('/scoreboard')}
                className={cn(
                  'text-xs px-4 py-2 rounded-lg font-medium transition-all duration-200 border hover:opacity-80',
                  theme === 'dark'
                    ? 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                    : 'bg-brand-50 border-brand-200 text-brand-600',
                )}
              >
                Scoreboard
              </button>
              <button
                onClick={() => {
                  sessionStorage.clear();
                  navigate('/play', { replace: true });
                }}
                className={cn(
                  'text-xs px-4 py-2 rounded-lg font-medium transition-all duration-200 border hover:opacity-80',
                  theme === 'dark'
                    ? 'bg-white/[0.04] border-white/10 text-zinc-400'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-500',
                )}
              >
                Logga ut
              </button>
            </div>
          </motion.div>

          {/* ── Stats Row ───────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-4">
            {[
              { label: 'Vinster', value: String(wins), accent: 'text-emerald-400' },
              { label: 'Förluster', value: String(losses), accent: 'text-red-400' },
              { label: 'Ranking', value: `—`, sub: '' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className={cn(
                  'rounded-2xl p-4 sm:p-5 border transition-colors duration-500',
                  cardBg,
                  cardBorder,
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : undefined}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
              >
                <p className={cn('text-xs mb-1', themeText(theme, 'secondary'))}>{stat.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      'text-2xl sm:text-3xl font-bold tracking-tight',
                      stat.accent || 'text-foreground',
                    )}
                  >
                    {stat.value}
                  </span>
                  {stat.sub && (
                    <span
                      className={cn(
                        'text-xs',
                        theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
                      )}
                    >
                      {stat.sub}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Win rate bar ─────────────────────────────── */}
          {totalPlayed > 0 && (
            <motion.div
              className={cn(
                'rounded-2xl p-4 sm:p-5 border mb-10 transition-colors duration-500',
                cardBg,
                cardBorder,
              )}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
            >
              <div className="flex justify-between text-xs mb-2">
                <span className={themeText(theme, 'secondary')}>Vinstprocent</span>
                <span
                  className={cn('font-mono', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}
                >
                  {winRate}%
                </span>
              </div>
              <div
                className={cn(
                  'h-2 rounded-full overflow-hidden',
                  theme === 'dark' ? 'bg-white/[0.06]' : 'bg-zinc-200',
                )}
              >
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${winRate}%` } : undefined}
                  transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}

          {/* ── Round Schedule ───────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
          >
            <h2 className={cn('text-sm font-semibold mb-4', themeText(theme, 'secondary'))}>
              Matchschema
            </h2>

            {rounds.length === 0 ? (
              <div className={cn('rounded-2xl p-8 border text-center', cardBg, cardBorder)}>
                <p className={themeText(theme, 'secondary')}>
                  Inga matcher schemalagda ännu. Turneringen har inte börjat.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rounds.map((round, i) => {
                  const isCurrent = i === currentRoundIdx;
                  const isPlayed = round.result !== null;
                  const isWin = round.result === 'win';
                  const isTbd = round.opponent === null;

                  return (
                    <motion.div
                      key={round.matchId}
                      className={cn(
                        'relative rounded-2xl p-4 sm:p-5 border transition-all duration-500',
                        isCurrent ? 'cursor-pointer hover:border-brand-500/50' : '',
                        cardBg,
                        isCurrent
                          ? theme === 'dark'
                            ? 'border-brand-500/40 shadow-[0_0_20px_rgba(var(--color-brand-500-rgb,99,102,241),0.08)]'
                            : 'border-brand-300 shadow-sm'
                          : cardBorder,
                        isTbd && 'opacity-50',
                      )}
                      initial={{ opacity: 0, x: -12 }}
                      animate={isInView ? { opacity: isTbd ? 0.5 : 1, x: 0 } : undefined}
                      transition={{ duration: 0.4, delay: 0.5 + i * 0.07, ease: 'easeOut' }}
                      onClick={
                        isCurrent ? () => navigate(`/play/match/${round.matchId}`) : undefined
                      }
                    >
                      {/* Live indicator */}
                      {isCurrent && !isTbd && (
                        <div className="absolute top-4 right-4 sm:top-5 sm:right-5">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500" />
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                        {/* Round badge + opponent (mobile) */}
                        <div className="flex items-center gap-3 sm:min-w-[100px]">
                          <span
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                              isCurrent && !isTbd
                                ? 'bg-brand-500 text-white'
                                : theme === 'dark'
                                  ? 'bg-white/[0.06] text-zinc-400'
                                  : 'bg-zinc-200 text-zinc-500',
                            )}
                          >
                            R{round.round}
                          </span>
                          <p className="sm:hidden text-sm font-medium text-foreground">
                            {isTbd ? (
                              <span
                                className={cn(
                                  'italic',
                                  theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
                                )}
                              >
                                Lottning ej gjord
                              </span>
                            ) : (
                              <>vs {round.opponent}</>
                            )}
                          </p>
                        </div>

                        {/* Time & Table */}
                        {!isTbd ? (
                          <div className="flex items-center gap-4 text-xs">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5',
                                themeText(theme, 'secondary'),
                              )}
                            >
                              <ClockIcon />
                              {round.time}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5',
                                themeText(theme, 'secondary'),
                              )}
                            >
                              <TableIcon />
                              Bord {round.table}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 text-xs">
                            <span
                              className={cn(
                                'italic',
                                theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
                              )}
                            >
                              TBD
                            </span>
                          </div>
                        )}

                        {/* Opponent (desktop) */}
                        <p className="hidden sm:block text-sm font-medium flex-1">
                          {isTbd ? (
                            <span
                              className={cn(
                                'italic',
                                theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
                              )}
                            >
                              Lottning ej gjord
                            </span>
                          ) : (
                            <span className="text-foreground">vs {round.opponent}</span>
                          )}
                        </p>

                        {/* Score + Result */}
                        <div className="flex items-center gap-3 sm:ml-auto">
                          {isPlayed && round.scoreDisplay && (
                            <span
                              className={cn(
                                'text-sm font-mono font-bold tracking-wider',
                                theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700',
                              )}
                            >
                              {round.scoreDisplay}
                            </span>
                          )}

                          {isPlayed ? (
                            <span
                              className={cn(
                                'inline-flex items-center justify-center w-8 h-7 rounded-lg text-xs font-bold border',
                                isWin
                                  ? theme === 'dark'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : theme === 'dark'
                                    ? 'bg-red-500/15 text-red-400 border-red-500/20'
                                    : 'bg-red-50 text-red-600 border-red-200',
                              )}
                            >
                              {isWin ? 'W' : 'L'}
                            </span>
                          ) : round.needsConfirmation ? (
                            <span
                              className={cn(
                                'inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border',
                                theme === 'dark'
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                                  : 'bg-amber-50 text-amber-600 border-amber-200',
                              )}
                            >
                              Bekräfta
                            </span>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border',
                                theme === 'dark'
                                  ? 'bg-white/[0.04] text-zinc-500 border-white/[0.06]'
                                  : 'bg-zinc-100 text-zinc-400 border-zinc-200',
                              )}
                            >
                              {isTbd ? 'TBD' : 'Nästa match'}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* ── Footer ───────────────────────────────────── */}
          <motion.div
            className={cn('mt-12 h-px', themeGradientLine(theme))}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: [0.3, 0.6, 0.3] } : undefined}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <p
            className={cn(
              'mt-4 text-center text-xs',
              theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
            )}
          >
            Lottning sker efter varje runda (swiss-format)
          </p>
        </div>
      </Container>
    </section>
  );
}
