import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match, Tournament } from '@/lib/database.types';
import {
  calculateRankings,
  advanceKnockoutRound,
  type MatchResult,
  type TeamStanding,
  type KnockoutBracket,
} from '@/lib/tournament-engine';
import { dbMatchToResult, teamsToEngine } from '@/pages/admin/lib/match-utils';

/* ─── Slide: Standings ─────────────────────────────── */

function StandingsSlide({
  standings,
  teamNameMap,
}: {
  standings: TeamStanding[];
  teamNameMap: Map<string, string>;
}) {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <h2 className="text-2xl font-bold text-white mb-6 text-center tracking-tight">
        Ställning
      </h2>

      <div className="flex-1 overflow-hidden">
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[3rem_1fr_4rem_4rem_4rem_4rem] gap-2 px-6 py-3 border-b border-white/[0.08] bg-white/[0.03] text-sm text-zinc-500">
            <span className="text-center">#</span>
            <span>Lag</span>
            <span className="text-center">V</span>
            <span className="text-center">F</span>
            <span className="text-center">BH</span>
            <span className="text-center">Cups</span>
          </div>

          {standings.map((s) => {
            const inTop8 = s.rank <= 8;
            return (
              <div
                key={s.id}
                className={cn(
                  'grid grid-cols-[3rem_1fr_4rem_4rem_4rem_4rem] gap-2 px-6 py-2.5 border-b border-white/[0.04] last:border-0 text-base',
                  inTop8 && 'bg-emerald-500/[0.05]',
                )}
              >
                <span className={cn('text-center font-mono', inTop8 ? 'text-emerald-400' : 'text-zinc-600')}>
                  {s.rank}
                </span>
                <span className="text-white truncate font-medium">
                  {teamNameMap.get(s.id) ?? s.name}
                </span>
                <span className="text-emerald-400 text-center font-mono">{s.wins}</span>
                <span className="text-red-400 text-center font-mono">{s.losses}</span>
                <span className="text-zinc-400 text-center font-mono">{s.opponentWins}</span>
                <span className="text-zinc-400 text-center font-mono">{s.totalCupsHit}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Slide: Current Round ─────────────────────────── */

function CurrentRoundSlide({
  matches,
  currentRound,
  teamNameMap,
}: {
  matches: Match[];
  currentRound: number;
  teamNameMap: Map<string, string>;
}) {
  const roundMatches = matches.filter((m) => m.round === currentRound);

  return (
    <div className="flex flex-col h-full px-8 py-6">
      <h2 className="text-2xl font-bold text-white mb-6 text-center tracking-tight">
        Runda {currentRound}
      </h2>

      <div className="flex-1 grid grid-cols-2 gap-4 auto-rows-min">
        {roundMatches.map((m) => {
          const t1 = teamNameMap.get(m.team1_id) ?? '?';
          const t2 = teamNameMap.get(m.team2_id) ?? '?';
          const isConfirmed = m.confirmed;
          const isDisputed = m.confirmed_by === 'disputed' && !m.confirmed;
          const hasResult = !!m.winner_id;

          return (
            <div
              key={m.id}
              className={cn(
                'rounded-xl border p-4',
                isConfirmed
                  ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
                  : isDisputed
                    ? 'border-amber-500/20 bg-amber-500/[0.05]'
                    : 'border-white/[0.08] bg-white/[0.03]',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                {m.table_number && (
                  <span className="text-xs text-zinc-600">Bord {m.table_number}</span>
                )}
                {isConfirmed && <span className="text-xs text-emerald-400">Klar</span>}
                {isDisputed && <span className="text-xs text-amber-400">Disputerad</span>}
                {hasResult && !isConfirmed && !isDisputed && (
                  <span className="text-xs text-zinc-500">Obekräftad</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={cn('text-base font-medium', m.winner_id === m.team1_id ? 'text-emerald-400' : 'text-white')}>
                  {t1}
                </span>
                <span className="text-lg font-mono font-bold text-zinc-400">
                  {hasResult ? `${m.score_team1}–${m.score_team2}` : 'vs'}
                </span>
                <span className={cn('text-base font-medium', m.winner_id === m.team2_id ? 'text-emerald-400' : 'text-white')}>
                  {t2}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Bracket helpers ──────────────────────────────── */

function BracketTeamRow({
  teamId,
  teamNameMap,
  result,
}: {
  teamId: string | null;
  teamNameMap: Map<string, string>;
  result: MatchResult | undefined;
}) {
  const isWinner = result?.winnerId === teamId;
  const isLoser = result?.loserId === teamId;
  const score = result
    ? result.team1Id === teamId
      ? result.scoreTeam1
      : result.scoreTeam2
    : null;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 text-sm',
        isWinner && 'bg-emerald-500/[0.08]',
      )}
    >
      <span
        className={cn(
          'truncate',
          isWinner ? 'text-emerald-400 font-medium' : isLoser ? 'text-zinc-600' : teamId ? 'text-white' : 'text-zinc-700',
        )}
      >
        {teamId ? (teamNameMap.get(teamId) ?? teamId) : 'TBD'}
      </span>
      {score !== null && <span className="text-zinc-500 font-mono ml-3">{score}</span>}
    </div>
  );
}

function BracketMatchCard({
  team1Id,
  team2Id,
  teamNameMap,
  results,
}: {
  team1Id: string | null;
  team2Id: string | null;
  teamNameMap: Map<string, string>;
  results: MatchResult[];
}) {
  const result = results.find(
    (r) =>
      (r.team1Id === team1Id && r.team2Id === team2Id) ||
      (r.team1Id === team2Id && r.team2Id === team1Id),
  );

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden w-full">
      <BracketTeamRow teamId={team1Id} teamNameMap={teamNameMap} result={result} />
      <div className="border-t border-white/[0.06]" />
      <BracketTeamRow teamId={team2Id} teamNameMap={teamNameMap} result={result} />
    </div>
  );
}

/* ─── Slide: Bracket ───────────────────────────────── */

function BracketSlide({
  bracket,
  knockoutResults,
  teamNameMap,
  champion,
}: {
  bracket: KnockoutBracket;
  knockoutResults: MatchResult[];
  teamNameMap: Map<string, string>;
  champion: string | null;
}) {
  return (
    <div className="flex flex-col h-full px-8 py-6">
      <h2 className="text-2xl font-bold text-white mb-6 text-center tracking-tight">
        Slutspel
      </h2>

      <div className="flex-1 grid grid-cols-3 gap-6 items-center">
        {/* QF */}
        <div className="space-y-3">
          <h4 className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Kvartsfinal</h4>
          {bracket.quarterfinals.map((qf, i) => (
            <BracketMatchCard key={i} team1Id={qf.team1Id} team2Id={qf.team2Id} teamNameMap={teamNameMap} results={knockoutResults} />
          ))}
        </div>
        {/* SF */}
        <div className="space-y-3">
          <h4 className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Semifinal</h4>
          <div className="space-y-16 pt-8">
            {bracket.semifinals.map((sf, i) => (
              <BracketMatchCard key={i} team1Id={sf.team1Id} team2Id={sf.team2Id} teamNameMap={teamNameMap} results={knockoutResults} />
            ))}
          </div>
        </div>
        {/* Final */}
        <div className="space-y-3">
          <h4 className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Final</h4>
          <div className="pt-24">
            <BracketMatchCard team1Id={bracket.final.team1Id} team2Id={bracket.final.team2Id} teamNameMap={teamNameMap} results={knockoutResults} />
          </div>
        </div>
      </div>

      {champion && (
        <div className="text-center py-4">
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-1">Mästare</p>
          <p className="text-3xl font-bold text-emerald-400">
            {teamNameMap.get(champion) ?? champion}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Slide: Champion ──────────────────────────────── */

function ChampionSlide({
  champion,
  teamNameMap,
}: {
  champion: string;
  teamNameMap: Map<string, string>;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150, damping: 12 }}
        className="text-center"
      >
        <p className="text-6xl mb-6">🏆</p>
        <p className="text-zinc-500 text-lg uppercase tracking-[0.3em] mb-4">Mästare</p>
        <p className="text-5xl sm:text-7xl font-bold text-emerald-400 tracking-tight">
          {teamNameMap.get(champion) ?? champion}
        </p>
      </motion.div>
    </div>
  );
}

/* ─── Display Page ─────────────────────────────────── */

export default function DisplayPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);

  const loadData = useCallback(async () => {
    const [tRes, teamsRes, matchesRes] = await Promise.all([
      supabase.from('tournament').select('*').maybeSingle(),
      supabase.from('teams').select('*'),
      supabase.from('matches').select('*').order('round', { ascending: true }),
    ]);
    setTournament(tRes.data);
    setTeams(teamsRes.data ?? []);
    setMatches(matchesRes.data ?? []);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('display')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadData())
      .subscribe((_status, err) => {
        if (!err) loadData();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const currentRound = tournament?.current_round ?? 0;
  const status = tournament?.status ?? 'not_started';
  const results = matches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
  const engineTeams = teamsToEngine(teams, results);
  const standings = calculateRankings(engineTeams, results);

  // Build knockout bracket
  const knockoutMatches = matches.filter((m) => m.round >= 8);
  const knockoutResults = knockoutMatches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
  let liveBracket: KnockoutBracket | null = null;

  if (status === 'knockout' && knockoutMatches.length >= 4) {
    const qfMatches = knockoutMatches.filter((m) => m.round === 8);
    if (qfMatches.length === 4) {
      liveBracket = {
        quarterfinals: qfMatches.map((m, i) => ({
          matchIndex: i,
          team1Id: m.team1_id,
          team2Id: m.team2_id,
        })),
        semifinals: [
          { matchIndex: 0, team1Id: null, team2Id: null },
          { matchIndex: 1, team1Id: null, team2Id: null },
        ],
        final: { matchIndex: 0, team1Id: null, team2Id: null },
      };

      const qfResults = qfMatches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
      if (qfResults.length === 4) {
        liveBracket = advanceKnockoutRound(liveBracket, qfResults, 'quarterfinals');
      }

      const sfMatches = knockoutMatches.filter((m) => m.round === 9);
      if (sfMatches.length === 2) {
        liveBracket.semifinals = sfMatches.map((m, i) => ({
          matchIndex: i,
          team1Id: m.team1_id,
          team2Id: m.team2_id,
        }));
        const sfResults = sfMatches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
        if (sfResults.length === 2) {
          liveBracket = advanceKnockoutRound(liveBracket, sfResults, 'semifinals');
        }
      }

      const finalMatch = knockoutMatches.find((m) => m.round === 10);
      if (finalMatch) {
        liveBracket.final = {
          matchIndex: 0,
          team1Id: finalMatch.team1_id,
          team2Id: finalMatch.team2_id,
        };
      }
    }
  }

  const finalResult = knockoutMatches.find((m) => m.round === 10 && m.winner_id);
  const champion = finalResult?.winner_id ?? null;

  // Compute available slides
  type Slide = 'standings' | 'round' | 'bracket' | 'champion';
  const availableSlides: Slide[] = [];

  if (champion) {
    // Lock on champion
    availableSlides.push('champion');
  } else {
    if (standings.length > 0) availableSlides.push('standings');
    if (currentRound > 0) availableSlides.push('round');
    if (liveBracket) availableSlides.push('bracket');
  }

  // Auto-cycle (15s)
  useEffect(() => {
    if (availableSlides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % availableSlides.length);
    }, 15000);
    return () => clearInterval(timer);
  }, [availableSlides.length]);

  // Keep slideIndex in bounds
  const safeIndex = availableSlides.length > 0 ? slideIndex % availableSlides.length : 0;
  const currentSlide = availableSlides[safeIndex] ?? 'standings';

  if (status === 'not_started' || availableSlides.length === 0) {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🏓</p>
          <p className="text-2xl font-bold text-white tracking-tight">Forskåpong</p>
          <p className="text-zinc-600 mt-2">Turneringen har inte startat ännu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Slide indicators */}
      {availableSlides.length > 1 && (
        <div className="flex justify-center gap-2 pt-4 pb-2">
          {availableSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlideIndex(i)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                i === safeIndex ? 'bg-brand-500 w-6' : 'bg-white/20',
              )}
            />
          ))}
        </div>
      )}

      {/* Slide content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="h-full"
          >
            {currentSlide === 'standings' && (
              <StandingsSlide standings={standings} teamNameMap={teamNameMap} />
            )}
            {currentSlide === 'round' && (
              <CurrentRoundSlide
                matches={matches}
                currentRound={currentRound}
                teamNameMap={teamNameMap}
              />
            )}
            {currentSlide === 'bracket' && liveBracket && (
              <BracketSlide
                bracket={liveBracket}
                knockoutResults={knockoutResults}
                teamNameMap={teamNameMap}
                champion={champion}
              />
            )}
            {currentSlide === 'champion' && champion && (
              <ChampionSlide champion={champion} teamNameMap={teamNameMap} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
