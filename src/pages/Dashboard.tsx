import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';
import { canAwayTeamConfirm, canHomeTeamReport } from '@/lib/home-away';
import { deriveWaveBannerState } from '@/lib/wave-banner';
import { getKnockoutStartRound } from '@/lib/constants';

import { supabase } from '@/lib/supabase';
import type { Team, Match } from '@/lib/database.types';
import FluidBackground from '@/components/common/FluidBackground';
import StaticNoise from '@/components/common/StaticNoise';
import RealtimeIndicator from '@/components/common/RealtimeIndicator';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';

/* ─── Types ───────────────────────────────────────────────────── */

interface MatchWithTeams extends Match {
  team1: Pick<Team, 'id' | 'name'>;
  team2: Pick<Team, 'id' | 'name'>;
}

interface RoundDisplay {
  round: number;
  wave: number;
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
  isBye: boolean;
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
    .order('round', { ascending: true })
    .order('wave', { ascending: true })
    .order('table_number', { ascending: true });
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
    wave: match.wave,
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
    isBye: false,
  };
}

interface TournamentContext {
  totalRounds: number;
  currentRound: number;
  status: string;
  generatedRounds: number[];
  // Current-round wave progress, for the "din tur / vänta" status banner.
  activeWave: number | null; // lowest wave still holding an unconfirmed match; null once all confirmed
  waveCount: number; // number of waves (spelpass) in the current round
  confirmedCount: number;
  totalCount: number;
}

/**
 * Tournament context for the schedule view: total/current round + status (for the
 * wave status banner), every round that has matches (for deriving this team's byes),
 * and the current round's wave progress.
 *
 * Byes: a bye leaves no match row, so it's inferred — a generated Swiss round
 * (round ≤ total_rounds) where the team has no match. The bye-aware scoreboard counts
 * a bye as a win (issue #26); the Dashboard mirrors that. Knockout rounds are excluded
 * by the total_rounds bound. Kept consistent with the engine's `deriveByes` (which works
 * the whole field at once); update both if the rule changes.
 *
 * Waves: a round is split into waves (spelpass) when there aren't enough tables for every
 * match at once. There is no "current wave" column — it's derived as the lowest wave with
 * an unconfirmed match, since earlier waves finish (get confirmed) before later ones play.
 */
async function fetchTournamentContext(): Promise<TournamentContext> {
  const [{ data: tournament }, { data: rows }] = await Promise.all([
    supabase.from('tournament').select('total_rounds, current_round, status').maybeSingle(),
    supabase.from('matches').select('round, wave, confirmed'),
  ]);
  const allRows = rows ?? [];
  const currentRound = tournament?.current_round ?? 0;
  const currentRows = allRows.filter((r) => r.round === currentRound);
  const openWaves = currentRows.filter((r) => !r.confirmed).map((r) => r.wave);
  return {
    totalRounds: tournament?.total_rounds ?? 0,
    currentRound,
    status: tournament?.status ?? 'not_started',
    generatedRounds: [...new Set(allRows.map((r) => r.round))],
    activeWave: openWaves.length > 0 ? Math.min(...openWaves) : null,
    waveCount: currentRows.length > 0 ? Math.max(...currentRows.map((r) => r.wave)) : 0,
    confirmedCount: currentRows.filter((r) => r.confirmed).length,
    totalCount: currentRows.length,
  };
}

function byeToRound(round: number): RoundDisplay {
  return {
    round,
    wave: 0,
    matchId: `bye-${round}`,
    time: null,
    table: null,
    opponent: null,
    opponentId: null,
    result: 'win', // a bye is a win (issue #26)
    scoreDisplay: null,
    confirmed: true,
    needsConfirmation: false,
    canReport: false,
    isBye: true,
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
  // Tournament's configured Swiss round count; rounds beyond it are knockout.
  const [swissRounds, setSwissRounds] = useState(7);
  // Live round + wave progress, for the wave status banner.
  const [roundCtx, setRoundCtx] = useState<
    Pick<
      TournamentContext,
      'currentRound' | 'status' | 'activeWave' | 'waveCount' | 'confirmedCount' | 'totalCount'
    >
  >({ currentRound: 0, status: 'not_started', activeWave: null, waveCount: 0, confirmedCount: 0, totalCount: 0 });
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
      const [teamData, matchData, ctx] = await Promise.all([
        fetchTeam(teamId),
        fetchMatches(teamId),
        fetchTournamentContext(),
      ]);
      setTeam(teamData);
      setPlayer1(teamData.player1 ?? '');
      setPlayer2(teamData.player2 ?? '');
      // Falls back to 7 before the tournament row sets total_rounds.
      setSwissRounds(ctx.totalRounds || 7);
      setRoundCtx({
        currentRound: ctx.currentRound,
        status: ctx.status,
        activeWave: ctx.activeWave,
        waveCount: ctx.waveCount,
        confirmedCount: ctx.confirmedCount,
        totalCount: ctx.totalCount,
      });
      // Played matches + bye rounds (counted as wins), in round order.
      const teamRounds = new Set(matchData.map((m) => m.round));
      const byeRounds = ctx.generatedRounds.filter(
        (round) => round <= ctx.totalRounds && !teamRounds.has(round),
      );
      const playedRounds = matchData.map((m) => matchToRound(m, teamId));
      setRounds(
        [...playedRounds, ...byeRounds.map(byeToRound)].sort(
          (a, b) => a.round - b.round || a.wave - b.wave,
        ),
      );
      setError('');
    } catch {
      setError('Kunde inte ladda data. Försök igen.');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const refreshUnlessSaving = useCallback(() => {
    // Skip the reconnect refetch if the player is mid-edit on their names —
    // otherwise the server values would clobber what they're typing.
    if (!savingNamesRef.current) loadData();
  }, [loadData]);
  const { status, onStatusChange } = useRealtimeStatus(refreshUnlessSaving);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function savePlayerNames(): Promise<void> {
    if (!teamId || !code || savingNamesRef.current) return;
    const trimmed = { player1: player1.trim() || null, player2: player2.trim() || null };
    savingNamesRef.current = true;
    try {
      // Gated by the team's own code; the empty strings become null server-side.
      const { error: saveError } = await supabase.rpc('update_team_profile', {
        p_code: code,
        p_player1: player1.trim(),
        p_player2: player2.trim(),
      });
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
      .subscribe(onStatusChange);
    return () => {
      void channel.unsubscribe();
    };
  }, [teamId, loadData, onStatusChange]);

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

  // ── Wave status banner ──────────────────────
  // "Am I up now, or waiting for a later wave?" — derivation is pure + tested in
  // wave-banner.ts; this team's only open match is in current_round (round advance
  // is gated on the whole round confirming).
  const currentMatch = rounds.find((r) => r.round === roundCtx.currentRound && !r.isBye) ?? null;
  const waveBannerState = deriveWaveBannerState(currentMatch, {
    status: roundCtx.status,
    waveCount: roundCtx.waveCount,
    activeWave: roundCtx.activeWave,
  });

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

        {/* ── Wave status banner ───────────────── */}
        {waveBannerState && currentMatch && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'border px-4 py-3 mb-6',
              waveBannerState === 'turn' && 'border-emerald-500/40 bg-emerald-500/5',
              waveBannerState === 'wait' && 'border-amber-500/40 bg-amber-500/5',
              waveBannerState === 'done' && (theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'),
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs',
                  waveBannerState === 'turn' && 'text-emerald-400',
                  waveBannerState === 'wait' && 'text-amber-400',
                  waveBannerState === 'done' && themeText(theme, 'muted'),
                )}
              >
                {waveBannerState === 'turn' ? '●' : waveBannerState === 'wait' ? '◐' : '✓'}
              </span>
              <span
                className={cn(
                  'text-xs uppercase tracking-[0.2em] font-semibold',
                  waveBannerState === 'turn' && 'text-emerald-400',
                  waveBannerState === 'wait' && 'text-amber-400',
                  waveBannerState === 'done' && themeText(theme, 'secondary'),
                )}
              >
                {waveBannerState === 'turn'
                  ? 'Din tur nu'
                  : waveBannerState === 'wait'
                    ? 'Vänta på ditt spelpass'
                    : currentMatch.confirmed
                      ? 'Klar för rundan'
                      : 'Inväntar bekräftelse'}
              </span>
            </div>

            {waveBannerState === 'turn' && (
              <>
                <p className={cn('text-sm mt-1', themeText(theme, 'secondary'))}>
                  Spelpass {currentMatch.wave}
                  {currentMatch.table ? ` · Bord ${currentMatch.table}` : ''} · vs{' '}
                  {currentMatch.opponent}
                </p>
                <button
                  onClick={() => navigate(`/play/match/${currentMatch.matchId}`)}
                  className={cn(
                    'mt-1.5 text-sm text-brand-400 underline underline-offset-4 decoration-brand-500/30',
                    'hover:decoration-brand-500/60 transition-colors',
                  )}
                >
                  {currentMatch.needsConfirmation
                    ? 'Bekräfta resultat →'
                    : currentMatch.canReport
                      ? 'Rapportera →'
                      : 'Visa match →'}
                </button>
              </>
            )}

            {waveBannerState === 'wait' && (
              <p className={cn('text-sm mt-1', themeText(theme, 'secondary'))}>
                Spelpass {roundCtx.activeWave} spelas nu. Du spelar i Spelpass {currentMatch.wave}
                {currentMatch.table ? ` · Bord ${currentMatch.table}` : ''}
                {currentMatch.time ? ` · ca ${currentMatch.time}` : ''}.
              </p>
            )}

            {waveBannerState === 'done' && (
              <p className={cn('text-sm mt-1', themeText(theme, 'muted'))}>
                Väntar på att runda {roundCtx.currentRound} spelas klar ({roundCtx.confirmedCount}/
                {roundCtx.totalCount}).
              </p>
            )}
          </motion.div>
        )}

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
          <div className="flex items-center gap-4">
            <RealtimeIndicator status={status} onRefresh={loadData} theme={theme} />
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

              if (round.isBye) {
                return (
                  <motion.div
                    key={round.matchId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                  >
                    <div
                      className={cn('grid gap-x-3 py-3', 'grid-cols-1', 'sm:grid-cols-[4rem_1fr_4rem]')}
                    >
                      <div
                        className={cn(
                          'text-[11px] font-mono tabular-nums sm:text-right mb-1 sm:mb-0',
                          themeText(theme, 'muted'),
                        )}
                      >
                        ——:——
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className={cn('mr-1.5', themeText(theme, 'muted'))}>▸</span>
                          <span className={themeText(theme, 'secondary')}>Spelfri runda</span>
                        </p>
                        <p className={cn('text-[11px] mt-0.5 ml-4', themeText(theme, 'muted'))}>
                          Gruppspel runda {round.round}
                          <span className="ml-2">Vinst utan match</span>
                        </p>
                      </div>
                      <div className="text-[11px] font-mono tabular-nums sm:text-left flex items-center mt-1 sm:mt-0 ml-4 sm:ml-0 sm:block">
                        <span className="font-black uppercase sm:block text-emerald-400">W</span>
                      </div>
                    </div>
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
              }

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
                      <span>{round.time ? `ca ${round.time}` : '——:——'}</span>
                      <span className="sm:block">{round.table ? `Bord ${round.table}` : '——'}</span>
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
                        {round.round >= getKnockoutStartRound(swissRounds) ? 'Slutspel' : 'Gruppspel'}{' '}
                        runda {round.round}
                        <span className="ml-2">Spelpass {round.wave}</span>
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
