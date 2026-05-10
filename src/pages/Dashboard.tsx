import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';
import { canAwayTeamConfirm, canHomeTeamReport } from '@/lib/home-away';

import { supabase } from '@/lib/supabase';
import type { Team, Match } from '@/lib/database.types';
import FluidBackground from '@/components/common/FluidBackground';
import StaticNoise from '@/components/common/StaticNoise';

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
  scoreDisplay: string | null;
  confirmed: boolean;
  needsConfirmation: boolean;
  canReport: boolean;
  isHomeTeam: boolean;
}

/* ─── Data fetching ───────────────────────────────────────────── */

async function fetchTeam(teamId: string) {
  const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();
  if (error) throw error;
  return data;
}

async function fetchMatches(teamId: string): Promise<MatchWithTeams[]> {
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .order('round', { ascending: true });
  if (matchError) throw matchError;
  if (!matches || matches.length === 0) return [];

  const teamIds = [...new Set(matches.flatMap((m) => [m.team1_id, m.team2_id]))];
  const teamResults = await Promise.all(
    teamIds.map((id) => supabase.from('teams').select('id, name').eq('id', id).single()),
  );

  const teamMap = new Map<string, { id: string; name: string }>();
  for (const result of teamResults) {
    if (result.data) teamMap.set(result.data.id, result.data);
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

  const needsConfirmation = canAwayTeamConfirm(match, teamId);
  const canReport = canHomeTeamReport(match, teamId) && !isTbd;

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
    isHomeTeam: match.team1_id === teamId,
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
        onBlur={() => {
          onBlur();
          onSave();
        }}
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
          {placeholder}
          <span className="animate-blink">|</span>
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

  useEffect(() => {
    if (!teamId || !code) navigate('/play', { replace: true });
  }, [teamId, code, navigate]);

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
      const { error: saveError } = await supabase.from('teams').update(trimmed).eq('id', teamId);
      if (!saveError) setTeam((prev) => (prev ? { ...prev, ...trimmed } : prev));
    } finally {
      savingNamesRef.current = false;
    }
  }

  useEffect(() => {
    if (!teamId) return;
    const channel = supabase
      .channel('dashboard-matches')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadData())
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

  const currentRoundIdx = rounds.findIndex(
    (r) => r.canReport || r.needsConfirmation || (r.result === null && !r.confirmed),
  );
  const wins = rounds.filter((r) => r.result === 'win').length;
  const losses = rounds.filter((r) => r.result === 'loss').length;
  const totalPlayed = wins + losses;
  const winRate = totalPlayed > 0 ? Math.round((wins / totalPlayed) * 100) : 0;
  const currentRound =
    currentRoundIdx !== -1
      ? rounds[currentRoundIdx].round
      : rounds.length > 0
        ? rounds[rounds.length - 1].round
        : 0;
  const totalRounds = rounds.length;

  /* ── Loading ──────────────────────────────── */
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
          <p className={cn('text-sm', themeText(theme, 'secondary'))}>Laddar…</p>
        </motion.div>
      </section>
    );
  }

  /* ── Error ────────────────────────────────── */
  if (error || !team) {
    return (
      <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-6 text-center">
          <p className="text-red-400 mb-4">{error || 'Kunde inte hitta laget.'}</p>
          <button onClick={loadData} className="px-4 py-2 text-sm bg-brand-500 text-white">
            Försök igen
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative w-full min-h-[calc(100vh-5rem)]">
      {/* ── Fluid cover header ──────────────────── */}
      <div className="relative h-[35vh] md:h-[40vh] flex items-end justify-center overflow-hidden">
        {/* Lava shader background */}
        <div className="absolute inset-0">
          <FluidBackground preset="Lava" />
        </div>
        <StaticNoise opacity={0.25} />

        {/* Gradient fade to black */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-background" />

        {/* Cover content */}
        <motion.div
          className="relative z-10 text-center pb-8 px-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-display text-5xl md:text-6xl text-brand-500 tracking-wider hdr-text-fill mb-3">
            {team.name}
          </h1>
          <div className="flex items-center justify-center gap-2 flex-wrap">
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
            <span className={cn('text-sm', themeText(theme, 'secondary'))}>&amp;</span>
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
          <span
            className={cn(
              'inline-block mt-3 text-[10px] font-mono tracking-widest px-2 py-0.5',
              themeText(theme, 'muted'),
            )}
          >
            {code}
          </span>
        </motion.div>
      </div>

      {/* ── Document body — narrow column ──────── */}
      <motion.div
        className="max-w-lg mx-auto px-6 pb-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Dashed rule */}
        <div
          className={cn(
            'border-t border-dashed my-8',
            theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200',
          )}
        />

        {/* ── Stats — brutalist W/L display ──── */}
        <div className="relative flex flex-col items-center justify-center py-6 md:py-8 mb-8">
          <div className="text-center">
            <p className="text-6xl sm:text-7xl md:text-8xl font-mono font-black tabular-nums tracking-tight leading-none">
              <span className="text-emerald-400">{wins}</span>
              <span className={cn('text-xl sm:text-2xl md:text-3xl align-top ml-1', themeText(theme, 'muted'))}>W</span>
              <span className="mx-3 md:mx-5" />
              <span className="text-red-400">{losses}</span>
              <span className={cn('text-xl sm:text-2xl md:text-3xl align-top ml-1', themeText(theme, 'muted'))}>L</span>
            </p>
            {totalPlayed > 0 && (
              <p className={cn('mt-3 text-sm font-mono tabular-nums', themeText(theme, 'secondary'))}>
                {winRate}% VINST
              </p>
            )}
          </div>
        </div>

        {/* Dashed rule */}
        <div
          className={cn(
            'border-t border-dashed my-8',
            theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200',
          )}
        />

        {/* ── Match schedule header ────────────── */}
        <div className="flex items-center justify-between mb-6">
          <p
            className={cn(
              'text-[10px] uppercase tracking-[0.2em] font-semibold',
              themeText(theme, 'muted'),
            )}
          >
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

        {/* ── Match entries ────────────────────── */}
        {rounds.length === 0 ? (
          <p className={cn('text-sm py-8 text-center', themeText(theme, 'secondary'))}>
            Inga matcher schemalagda ännu.
          </p>
        ) : (
          <div className="space-y-0">
            {rounds.map((round, i) => {
              const isCurrent = i === currentRoundIdx;
              const isPlayed = round.result !== null;
              const isWin = round.result === 'win';
              const isTbd = round.opponent === null;

              return (
                <motion.div
                  key={round.matchId}
                  className={cn(isTbd && 'opacity-35')}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: isTbd ? 0.35 : 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                >
                  {/* 3-column grid: margin-left | content | margin-right */}
                  <div
                    className={cn(
                      'grid gap-x-3 py-3',
                      'grid-cols-1',
                      'sm:grid-cols-[4rem_1fr_4rem]',
                    )}
                  >
                    {/* Left margin: time + table */}
                    <div
                      className={cn(
                        'text-[11px] font-mono tabular-nums sm:text-right',
                        themeText(theme, 'muted'),
                        'flex gap-2 sm:block mb-1 sm:mb-0',
                      )}
                    >
                      <span>{round.time ?? '——:——'}</span>
                      <span className="sm:block">{round.table ? `B${round.table}` : '——'}</span>
                    </div>

                    {/* Center: main content */}
                    <div>
                      <p className={cn('text-sm', isCurrent && 'font-medium')}>
                        <span
                          className={cn(
                            'mr-1.5',
                            isCurrent ? 'text-brand-500' : themeText(theme, 'muted'),
                          )}
                        >
                          {isCurrent ? '●' : '▸'}
                        </span>
                        {isTbd ? (
                          <span className={themeText(theme, 'muted')}>TBD</span>
                        ) : (
                          <span className="text-foreground">vs {round.opponent}</span>
                        )}
                      </p>
                      <p className={cn('text-[11px] mt-0.5 ml-4', themeText(theme, 'muted'))}>
                        Runda {round.round}
                        <span className="ml-2">{round.isHomeTeam ? 'Hemma' : 'Borta'}</span>
                        {isCurrent && (
                          <span
                            className={cn(
                              'ml-2 uppercase tracking-wider font-semibold',
                              theme === 'dark' ? 'text-brand-400' : 'text-brand-600',
                            )}
                          >
                            nästa
                          </span>
                        )}
                      </p>
                      {isCurrent && !isTbd && (
                        <button
                          onClick={() => navigate(`/play/match/${round.matchId}`)}
                          className={cn(
                            'mt-1.5 ml-4 text-sm text-brand-400 underline underline-offset-4 decoration-brand-500/30',
                            'hover:decoration-brand-500/60 transition-colors',
                          )}
                        >
                          {round.needsConfirmation
                            ? 'Bekräfta resultat →'
                            : round.canReport
                              ? 'Rapportera →'
                              : 'Visa match →'}
                        </button>
                      )}
                    </div>

                    {/* Right margin: score + result */}
                    <div
                      className={cn(
                        'text-[11px] font-mono tabular-nums sm:text-left',
                        'flex gap-2 items-center mt-1 sm:mt-0 ml-4 sm:ml-0 sm:block',
                      )}
                    >
                      {isPlayed && round.scoreDisplay && (
                        <span className={themeText(theme, 'secondary')}>{round.scoreDisplay}</span>
                      )}
                      {isPlayed && (
                        <span
                          className={cn(
                            'font-black uppercase sm:block',
                            isWin ? 'text-emerald-400' : 'text-red-400',
                          )}
                        >
                          {isWin ? 'W' : 'L'}
                        </span>
                      )}
                      {round.needsConfirmation && !isPlayed && (
                        <span className="font-bold text-amber-400 sm:block">!</span>
                      )}
                    </div>
                  </div>

                  {/* Subtle separator between entries */}
                  {i < rounds.length - 1 && (
                    <div
                      className={cn(
                        'h-px ml-0 sm:ml-[4.75rem]',
                        theme === 'dark' ? 'bg-zinc-800/40' : 'bg-zinc-100',
                      )}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Dashed rule */}
        <div
          className={cn(
            'border-t border-dashed my-8',
            theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200',
          )}
        />

        {/* ── Page footer ─────────────────────── */}
        <p
          className={cn(
            'text-center text-[11px] font-mono tabular-nums',
            themeText(theme, 'muted'),
          )}
        >
          Runda {currentRound} av {totalRounds}
        </p>
      </motion.div>
    </section>
  );
}
