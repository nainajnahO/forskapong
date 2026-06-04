import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getKnockoutStartRound, DEFAULT_KNOCKOUT_SIZE } from '@/lib/constants';
import type { Team, Match, Tournament } from '@/lib/database.types';
import {
  knockoutLabels,
  type MatchResult,
  type BracketSlot,
  type KnockoutBracket,
} from '@/lib/tournament-engine';
import { dbMatchToResult, standingsFromMatches } from '@/pages/admin/lib/match-utils';
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
      supabase
        .from('matches')
        .select('*')
        .order('round', { ascending: true })
        .order('wave', { ascending: true })
        .order('table_number', { ascending: true }),
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
    // Polling fallback for reliable display updates
    const poll = setInterval(loadData, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [loadData]);

  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const status = tournament?.status ?? 'not_started';
  const currentRound = tournament?.current_round ?? 0;
  const knockoutStartRound = getKnockoutStartRound(tournament?.total_rounds ?? 7);
  const playoffSize = tournament?.knockout_size ?? DEFAULT_KNOCKOUT_SIZE;
  const numKnockoutRounds = Math.log2(playoffSize);
  const standings = standingsFromMatches(teams, matches);

  // Group matches by round
  const roundsMap = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = roundsMap.get(m.round) ?? [];
    arr.push(m);
    roundsMap.set(m.round, arr);
  }
  const rounds = [...roundsMap.entries()].sort(([a], [b]) => a - b);

  // Build the knockout bracket straight from the generated match rows: each round's
  // matches give its pairings (bracket order recovered by sorting on wave then table);
  // ungenerated rounds stay empty (TBD).
  const knockoutMatches = matches.filter((m) => m.round >= knockoutStartRound);
  const knockoutResults = knockoutMatches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
  let liveBracket: KnockoutBracket | null = null;
  const firstRoundMatches = knockoutMatches.filter((m) => m.round === knockoutStartRound);
  if (status === 'knockout' && firstRoundMatches.length === playoffSize / 2) {
    const bracketRounds: BracketSlot[][] = [];
    for (let r = 0; r < numKnockoutRounds; r++) {
      const roundMatches = knockoutMatches
        .filter((m) => m.round === knockoutStartRound + r)
        .sort((a, b) => a.wave - b.wave || (a.table_number ?? 0) - (b.table_number ?? 0));
      const slotCount = playoffSize >> (r + 1);
      bracketRounds.push(
        Array.from({ length: slotCount }, (_, i) => ({
          matchIndex: i,
          team1Id: roundMatches[i]?.team1_id ?? null,
          team2Id: roundMatches[i]?.team2_id ?? null,
        })),
      );
    }
    liveBracket = { rounds: bracketRounds, labels: knockoutLabels(playoffSize) };
  }

  const lastKnockoutRound = knockoutStartRound + numKnockoutRounds - 1;
  const finalResult = knockoutMatches.find((m) => m.round === lastKnockoutRound && m.winner_id);
  const champion = finalResult?.winner_id ?? null;

  if (status === 'not_started') {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">🏓</p>
          <p className="text-2xl font-bold text-white tracking-tight">TentaFestivalen Beerpong</p>
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
          <h1 className="text-xl font-bold text-white tracking-tight">TentaFestivalen Beerpong</h1>
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

      {/* Map view */}
      <div className="flex-1 min-h-0 px-8 pb-8">
        <TournamentMapView
          rounds={rounds}
          standings={standings}
          teamNameMap={teamNameMap}
          liveBracket={liveBracket}
          knockoutResults={knockoutResults}
          champion={champion}
          totalRounds={tournament?.total_rounds ?? 7}
          status={status}
          currentRound={currentRound}
          large
        />
      </div>

      {/* Champion overlay */}
      {champion && <ChampionOverlay champion={champion} teamNameMap={teamNameMap} />}
    </div>
  );
}
