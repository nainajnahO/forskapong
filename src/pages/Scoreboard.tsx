import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';

import { supabase } from '@/lib/supabase';
import type { Team, Match } from '@/lib/database.types';
import {
  calculateRankings,
  detectUnresolvedCutoffTie,
  type MatchResult,
  type TeamStanding,
} from '@/lib/tournament-engine';
import { dbMatchToResult, teamsToEngine } from '@/pages/admin/lib/match-utils';
import FluidBackground from '@/components/common/FluidBackground';
import StaticNoise from '@/components/common/StaticNoise';

/* ─── Types ───────────────────────────────────────────────────── */

interface ScoreboardStanding extends TeamStanding {
  id: string;
  name: string;
  player1: string | null;
  player2: string | null;
}

const PLAYOFF_CUTOFF = 8;

/* ─── Data ────────────────────────────────────────────────────── */

async function fetchAllTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*');
  if (error) throw error;
  return data ?? [];
}

async function fetchAllMatches(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('round', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* ─── Scoreboard Component ────────────────────────────────────── */

export default function Scoreboard() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const teamId = sessionStorage.getItem('teamId');

  useEffect(() => {
    if (!teamId) navigate('/play', { replace: true });
  }, [teamId, navigate]);

  const [standings, setStandings] = useState<ScoreboardStanding[]>([]);
  const [cutoffWarningTeamIds, setCutoffWarningTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [teams, matches] = await Promise.all([fetchAllTeams(), fetchAllMatches()]);
      const results = matches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
      const engineStandings = calculateRankings(teamsToEngine(teams, results), results);
      const playerMap = new Map(teams.map((t) => [t.id, { player1: t.player1, player2: t.player2 }]));
      const merged = engineStandings.map((s) => ({
        ...s,
        player1: playerMap.get(s.id)?.player1 ?? null,
        player2: playerMap.get(s.id)?.player2 ?? null,
      }));
      setStandings(merged);
      const warning = detectUnresolvedCutoffTie(engineStandings, results, PLAYOFF_CUTOFF);
      setCutoffWarningTeamIds(warning?.teamIds ?? []);
      setError('');
    } catch {
      setError('Kunde inte ladda ställningen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const channel = supabase
      .channel('scoreboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadData())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' }, () =>
        loadData(),
      )
      .subscribe();
    return () => {
      void channel.unsubscribe();
    };
  }, [loadData]);

  /* ── Loading ──────────────────────────────────────── */
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
          <p className={cn('text-sm', themeText(theme, 'secondary'))}>Laddar ställning…</p>
        </motion.div>
      </section>
    );
  }

  /* ── Error ────────────────────────────────────────── */
  if (error) {
    return (
      <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
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
      <div className="relative h-[28vh] md:h-[32vh] flex items-end justify-center overflow-hidden">
        <div className="absolute inset-0">
          <FluidBackground preset="Lava" />
        </div>
        <StaticNoise opacity={0.25} />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-background" />

        <motion.div
          className="relative z-10 text-center pb-8 px-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="font-display text-4xl md:text-5xl text-brand-500 tracking-wider hdr-text-fill mb-2">
            Scoreboard
          </h1>
          <p className={cn('text-sm', themeText(theme, 'secondary'))}>
            Topp {PLAYOFF_CUTOFF} går vidare till slutspel
          </p>
        </motion.div>
      </div>

      {/* ── Document body — narrow column ──────── */}
      <motion.div
        className="max-w-2xl mx-auto px-6 pb-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Back link + legend */}
        <div className="flex items-center justify-between mt-6 mb-4">
          {teamId && (
            <button
              onClick={() => navigate('/play/dashboard')}
              className={cn(
                'text-xs transition-opacity hover:opacity-70',
                themeText(theme, 'secondary'),
              )}
            >
              ← Tillbaka
            </button>
          )}
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className={cn('text-[10px]', themeText(theme, 'muted'))}>Slutspel</span>
            </div>
          </div>
        </div>

        {/* Dashed rule */}
        <div
          className={cn(
            'border-t border-dashed',
            theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200',
          )}
        />

        {/* ── Column headers ──────────────────── */}
        <div
          className={cn(
            'grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem] sm:grid-cols-[2.5rem_1fr_3rem_3rem_3.5rem_4.25rem] gap-0 py-3',
            'text-[9px] font-mono uppercase tracking-widest',
            themeText(theme, 'muted'),
          )}
        >
          <span>#</span>
          <span>Lag</span>
          <span className="text-center">V</span>
          <span className="text-center">F</span>
          <span className="text-center hidden sm:block" title="Cup difference">
            Diff
          </span>
          <span className="text-center">Cup +/-</span>
        </div>

        <div
          className={cn(
            'border-t',
            theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200',
          )}
        />

        {/* ── Table rows ──────────────────────── */}
        {standings.map((team, i) => {
          const inPlayoff = team.rank <= PLAYOFF_CUTOFF;
          const isCurrentTeam = team.id === teamId;
          const isAtCutoff = team.rank === PLAYOFF_CUTOFF;
          const hasCutoffWarning = cutoffWarningTeamIds.includes(team.id);

          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 + i * 0.02 }}
            >
              <div
                className={cn(
                  'grid grid-cols-[2rem_1fr_2.5rem_2.5rem_3rem] sm:grid-cols-[2.5rem_1fr_3rem_3rem_3.5rem_4.25rem] gap-0 py-2.5 items-center',
                  inPlayoff && (theme === 'dark' ? 'bg-emerald-500/[0.03]' : 'bg-emerald-50/30'),
                  isCurrentTeam &&
                    (theme === 'dark'
                      ? 'border-l-2 border-l-brand-500'
                      : 'border-l-2 border-l-brand-500'),
                  !isCurrentTeam && 'border-l-2 border-l-transparent',
                )}
              >
                {/* Rank */}
                <span
                  className={cn(
                    'text-xs font-mono tabular-nums',
                    inPlayoff
                      ? theme === 'dark'
                        ? 'text-emerald-400 font-bold'
                        : 'text-emerald-600 font-bold'
                      : themeText(theme, 'muted'),
                  )}
                >
                  {team.rank}
                </span>

                {/* Team info */}
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm truncate',
                      isCurrentTeam ? 'text-brand-500 font-semibold' : 'text-foreground',
                    )}
                  >
                    {team.name}
                    {hasCutoffWarning && (
                      <span className="ml-2 text-amber-400" title="Oavgjort vid slutspelsgränsen">
                        ⚠
                      </span>
                    )}
                    {isCurrentTeam && (
                      <span
                        className={cn(
                          'ml-2 text-[9px] font-bold uppercase tracking-wider',
                          theme === 'dark' ? 'text-brand-400' : 'text-brand-600',
                        )}
                      >
                        du
                      </span>
                    )}
                  </p>
                  <p
                    className={cn(
                      'text-[11px] truncate',
                      themeText(theme, 'muted'),
                    )}
                  >
                    {team.player1 && team.player2
                      ? `${team.player1} & ${team.player2}`
                      : team.player1 || team.player2 || '–'}
                  </p>
                </div>

                {/* Wins */}
                <span
                  className={cn(
                    'text-xs font-mono font-bold tabular-nums text-center',
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600',
                  )}
                >
                  {team.wins}
                </span>

                {/* Losses */}
                <span
                  className={cn(
                    'text-xs font-mono font-bold tabular-nums text-center',
                    theme === 'dark' ? 'text-red-400' : 'text-red-600',
                  )}
                >
                  {team.losses}
                </span>

                {/* Cup diff (desktop) */}
                <span
                  className={cn(
                    'text-xs font-mono tabular-nums text-center hidden sm:block',
                    themeText(theme, 'muted'),
                  )}
                >
                  {team.cupDiff > 0 ? `+${team.cupDiff}` : team.cupDiff}
                </span>

                {/* Cup +/- */}
                <span
                  className={cn(
                    'text-xs font-mono tabular-nums text-center',
                    themeText(theme, 'muted'),
                  )}
                >
                  {team.cupsFor}-{team.cupsAgainst}
                </span>
              </div>

              {/* Row separator — thicker at playoff cutoff */}
              {isAtCutoff ? (
                <div
                  className={cn(
                    'border-t-2 border-dashed',
                    theme === 'dark' ? 'border-emerald-500/30' : 'border-emerald-300',
                  )}
                />
              ) : (
                i < standings.length - 1 && (
                  <div
                    className={cn(
                      'h-px',
                      theme === 'dark' ? 'bg-zinc-800/40' : 'bg-zinc-100',
                    )}
                  />
                )
              )}
            </motion.div>
          );
        })}

        {/* Dashed rule */}
        <div
          className={cn(
            'border-t border-dashed my-8',
            theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200',
          )}
        />

        {/* ── Scoring explanation — as prose ───── */}
        <p className={cn('text-[11px] leading-relaxed', themeText(theme, 'muted'))}>
          <span className={themeText(theme, 'secondary')}>Rankningsordning:</span> 1) Antal vinster,
          2) Cup diff, 3) Inbördes möte mellan två lag (om tillämpligt).
        </p>
        {cutoffWarningTeamIds.length === 2 && (
          <p className={cn('text-[11px] leading-relaxed mt-2 text-amber-400')}>
            ⚠ Två lag är fortfarande lika vid slutspelsgränsen. Avgör med sten-sax-påse framför
            admins.
          </p>
        )}

        {/* Page footer */}
        <p
          className={cn(
            'text-center text-[11px] font-mono tabular-nums mt-8',
            themeText(theme, 'muted'),
          )}
        >
          {standings.length} lag
        </p>
      </motion.div>
    </section>
  );
}
