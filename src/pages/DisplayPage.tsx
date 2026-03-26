import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match, Tournament } from '@/lib/database.types';
import {
  calculateRankings,
  advanceKnockoutRound,
  type MatchResult,
  type KnockoutBracket,
} from '@/lib/tournament-engine';
import { dbMatchToResult, teamsToEngine } from '@/pages/admin/lib/match-utils';
import TournamentMapView from '@/pages/admin/components/TournamentMapView';

/* ─── Champion overlay ────────────────────────────────── */

function ChampionOverlay({
  champion,
  teamNameMap,
}: {
  champion: string;
  teamNameMap: Map<string, string>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-10"
    >
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
    </motion.div>
  );
}

/* ─── Display Page ─────────────────────────────────────── */

export default function DisplayPage() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

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
  const status = tournament?.status ?? 'not_started';
  const currentRound = tournament?.current_round ?? 0;
  const results = matches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
  const engineTeams = teamsToEngine(teams, results);
  const standings = calculateRankings(engineTeams, results);

  // Group matches by round
  const roundsMap = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = roundsMap.get(m.round) ?? [];
    arr.push(m);
    roundsMap.set(m.round, arr);
  }
  const rounds = [...roundsMap.entries()].sort(([a], [b]) => a - b);

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

  // Current round progress
  const currentRoundMatches = matches.filter((m) => m.round === currentRound);
  const confirmedCurrent = currentRoundMatches.filter((m) => m.confirmed).length;
  const totalCurrent = currentRoundMatches.length;
  const progressPct = totalCurrent > 0 ? (confirmedCurrent / totalCurrent) * 100 : 0;

  if (status === 'not_started') {
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
    <div className="relative h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white tracking-tight">Forskåpong</h1>
          <div
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border',
              status === 'swiss' && 'bg-brand-500/10 text-brand-400 border-brand-500/20',
              status === 'knockout' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              status === 'finished' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            )}
          >
            {status === 'swiss' && `Swiss — Runda ${currentRound}`}
            {status === 'knockout' && 'Slutspel'}
            {status === 'finished' && 'Avslutad'}
          </div>
        </div>
        <span className="text-xs text-zinc-600">
          {teams.length} lag · {matches.length} matcher
        </span>
      </div>

      {/* Progress bar */}
      {totalCurrent > 0 && (
        <div className="px-8 pb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Runda {currentRound} framsteg</span>
            <span className="text-zinc-400 font-mono">
              {confirmedCurrent}/{totalCurrent} matcher klara
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-brand-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Map view */}
      <div className="flex-1 min-h-0 px-8 pb-8">
        <TournamentMapView
          rounds={rounds}
          standings={standings}
          teamNameMap={teamNameMap}
          liveBracket={liveBracket}
          knockoutResults={knockoutResults}
          champion={champion}
          totalRounds={7}
          status={status}
          large
        />
      </div>

      {/* Champion overlay */}
      {champion && <ChampionOverlay champion={champion} teamNameMap={teamNameMap} />}
    </div>
  );
}
