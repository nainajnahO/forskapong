import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match } from '@/lib/database.types';
import Container from '../components/common/Container';
import SectionLabel from '../components/common/SectionLabel';

/* ─── Types ───────────────────────────────────────────────────── */

interface TeamStanding {
  id: string;
  name: string;
  player1: string | null;
  player2: string | null;
  wins: number;
  losses: number;
  opponentWins: number; // Buchholz: sum of opponents' wins
  totalCupsHit: number; // Tiebreaker 3: total cups scored across all games
  rank: number;
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

function calculateStandings(teams: Team[], matches: Match[]): TeamStanding[] {
  // Build per-team stats from matches
  const teamStats = new Map<
    string,
    { wins: number; losses: number; cupsHit: number; opponents: string[] }
  >();

  // Initialize all teams
  for (const team of teams) {
    teamStats.set(team.id, { wins: 0, losses: 0, cupsHit: 0, opponents: [] });
  }

  // Process matches that have a result (winner_id set)
  for (const match of matches) {
    if (!match.winner_id || !match.loser_id) continue;

    const winner = teamStats.get(match.winner_id);
    const loser = teamStats.get(match.loser_id);
    if (!winner || !loser) continue;

    winner.wins += 1;
    loser.losses += 1;

    // Track opponents for Buchholz
    winner.opponents.push(match.loser_id);
    loser.opponents.push(match.winner_id);

    // Cups hit: score_team1 = cups hit by team1, score_team2 = cups hit by team2
    if (match.score_team1 !== null && match.score_team2 !== null) {
      const t1Stats = teamStats.get(match.team1_id);
      const t2Stats = teamStats.get(match.team2_id);
      if (t1Stats) t1Stats.cupsHit += match.score_team1;
      if (t2Stats) t2Stats.cupsHit += match.score_team2;
    }
  }

  // Calculate Buchholz (sum of opponents' wins)
  const standings: TeamStanding[] = teams.map((team) => {
    const stats = teamStats.get(team.id)!;
    const opponentWins = stats.opponents.reduce((sum, oppId) => {
      const oppStats = teamStats.get(oppId);
      return sum + (oppStats?.wins ?? 0);
    }, 0);

    return {
      id: team.id,
      name: team.name,
      player1: team.player1,
      player2: team.player2,
      wins: stats.wins,
      losses: stats.losses,
      opponentWins,
      totalCupsHit: stats.cupsHit,
      rank: 0,
    };
  });

  // Sort: 1) wins desc, 2) opponent wins desc (Buchholz), 3) total cups hit desc
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.opponentWins !== a.opponentWins) return b.opponentWins - a.opponentWins;
    return b.totalCupsHit - a.totalCupsHit;
  });

  // Assign ranks
  standings.forEach((s, i) => {
    s.rank = i + 1;
  });

  return standings;
}

/* ─── Scoreboard Component ────────────────────────────────────── */

export default function Scoreboard() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const teamId = sessionStorage.getItem('teamId');

  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [teams, matches] = await Promise.all([fetchAllTeams(), fetchAllMatches()]);
      setStandings(calculateStandings(teams, matches));
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

  // Real-time: refresh when matches update
  useEffect(() => {
    const channel = supabase
      .channel('scoreboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [loadData]);

  const cardBg = theme === 'dark' ? 'bg-white/[0.03]' : 'bg-zinc-50';
  const cardBorder = theme === 'dark' ? 'border-white/[0.06]' : 'border-zinc-200';

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
        <Container className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
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
        {/* ── Header ──────────────────────────────────── */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <SectionLabel variant="gradient">STÄLLNING</SectionLabel>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-brand-500 tracking-wider hdr-text-fill mt-1">
            Scoreboard
          </h1>
          <p className={cn('mt-2 text-sm', themeText(theme, 'secondary'))}>
            Topp {PLAYOFF_CUTOFF} går vidare till slutspel
          </p>
        </motion.div>

        {/* ── Playoff cutoff legend ────────────────────── */}
        <motion.div
          className="flex items-center gap-4 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-3 h-3 rounded-sm',
                theme === 'dark' ? 'bg-emerald-500/30' : 'bg-emerald-100',
              )}
            />
            <span className={cn('text-xs', themeText(theme, 'secondary'))}>Slutspel</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-3 h-3 rounded-sm',
                theme === 'dark' ? 'bg-white/[0.03]' : 'bg-zinc-50',
              )}
            />
            <span className={cn('text-xs', themeText(theme, 'secondary'))}>Eliminerad</span>
          </div>
        </motion.div>

        {/* ── Table ───────────────────────────────────── */}
        <motion.div
          className={cn('rounded-2xl border overflow-hidden', cardBorder)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        >
          {/* Table header */}
          <div
            className={cn(
              'grid grid-cols-[2.5rem_1fr_3rem_3rem_3.5rem_3.5rem] sm:grid-cols-[3rem_1fr_4rem_4rem_5rem_5rem] gap-0 px-4 sm:px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b',
              theme === 'dark'
                ? 'bg-white/[0.02] text-zinc-500 border-white/[0.06]'
                : 'bg-zinc-100 text-zinc-400 border-zinc-200',
            )}
          >
            <span>#</span>
            <span>Lag</span>
            <span className="text-center">V</span>
            <span className="text-center">F</span>
            <span className="text-center hidden sm:block" title="Motståndarvinster (Buchholz)">
              BH
            </span>
            <span className="text-center" title="Totala koppar träffade">
              Cups
            </span>
          </div>

          {/* Table rows */}
          {standings.map((team, i) => {
            const inPlayoff = team.rank <= PLAYOFF_CUTOFF;
            const isCurrentTeam = team.id === teamId;
            const isAtCutoff = team.rank === PLAYOFF_CUTOFF;

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.03, ease: 'easeOut' }}
              >
                <div
                  className={cn(
                    'grid grid-cols-[2.5rem_1fr_3rem_3rem_3.5rem_3.5rem] sm:grid-cols-[3rem_1fr_4rem_4rem_5rem_5rem] gap-0 px-4 sm:px-6 py-3 items-center transition-colors duration-300',
                    // Playoff highlight
                    inPlayoff
                      ? theme === 'dark'
                        ? 'bg-emerald-500/[0.04]'
                        : 'bg-emerald-50/50'
                      : cardBg,
                    // Current team highlight
                    isCurrentTeam &&
                      (theme === 'dark'
                        ? 'ring-1 ring-inset ring-brand-500/30'
                        : 'ring-1 ring-inset ring-brand-300'),
                    // Border
                    isAtCutoff
                      ? theme === 'dark'
                        ? 'border-b-2 border-emerald-500/30'
                        : 'border-b-2 border-emerald-300'
                      : i < standings.length - 1
                        ? theme === 'dark'
                          ? 'border-b border-white/[0.04]'
                          : 'border-b border-zinc-100'
                        : '',
                  )}
                >
                  {/* Rank */}
                  <span
                    className={cn(
                      'text-sm font-bold font-mono',
                      inPlayoff
                        ? theme === 'dark'
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : themeText(theme, 'secondary'),
                    )}
                  >
                    {team.rank}
                  </span>

                  {/* Team info */}
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm font-semibold truncate',
                        isCurrentTeam ? 'text-brand-500' : 'text-foreground',
                      )}
                    >
                      {team.name}
                      {isCurrentTeam && (
                        <span
                          className={cn(
                            'ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded',
                            theme === 'dark'
                              ? 'bg-brand-500/15 text-brand-400'
                              : 'bg-brand-50 text-brand-600',
                          )}
                        >
                          DU
                        </span>
                      )}
                    </p>
                    <p
                      className={cn(
                        'text-xs truncate hidden sm:block',
                        themeText(theme, 'secondary'),
                      )}
                    >
                      {team.player1} & {team.player2}
                    </p>
                  </div>

                  {/* Wins */}
                  <span
                    className={cn(
                      'text-sm font-bold text-center',
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600',
                    )}
                  >
                    {team.wins}
                  </span>

                  {/* Losses */}
                  <span
                    className={cn(
                      'text-sm font-bold text-center',
                      theme === 'dark' ? 'text-red-400' : 'text-red-600',
                    )}
                  >
                    {team.losses}
                  </span>

                  {/* Buchholz (desktop) */}
                  <span
                    className={cn(
                      'text-sm font-mono text-center hidden sm:block',
                      themeText(theme, 'secondary'),
                    )}
                  >
                    {team.opponentWins}
                  </span>

                  {/* Total cups */}
                  <span
                    className={cn('text-sm font-mono text-center', themeText(theme, 'secondary'))}
                  >
                    {team.totalCupsHit}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Scoring explanation ──────────────────────── */}
        <motion.div
          className={cn('mt-6 rounded-xl p-4 border', cardBg, cardBorder)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p className={cn('text-xs leading-relaxed', themeText(theme, 'secondary'))}>
            <span className="font-semibold text-foreground">Rankningsordning:</span> 1) Antal
            vinster, 2) Motståndarvinster (BH) — summan av alla motståndares vinster, 3) Totala
            koppar träffade.
          </p>
        </motion.div>

        {/* ── Back link ───────────────────────────────── */}
        {teamId && (
          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button
              onClick={() => navigate('/play/dashboard')}
              className={cn(
                'text-sm transition-opacity hover:opacity-70',
                themeText(theme, 'secondary'),
              )}
            >
              ← Tillbaka till matchschemat
            </button>
          </motion.div>
        )}
      </Container>
    </section>
  );
}
