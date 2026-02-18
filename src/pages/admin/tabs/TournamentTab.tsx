import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match, Tournament } from '@/lib/database.types';
import {
  generateSwissPairings,
  generateKnockoutBracket,
  advanceKnockoutRound,
  calculateRankings,
  type TournamentTeam,
  type MatchResult,
  type TeamStanding,
  type KnockoutBracket as KnockoutBracketType,
} from '@/lib/tournament-engine';
import { List, LayoutGrid } from 'lucide-react';
import StandingsTable from '../components/StandingsTable';
import SwissRoundCard from '../components/SwissRoundCard';
import KnockoutBracketView from '../components/KnockoutBracketView';
import MatchResultEditor from '../components/MatchResultEditor';
import TournamentMapView from '../components/TournamentMapView';

/* ─── Helpers ─────────────────────────────────────────────────── */

function dbMatchToResult(m: Match): MatchResult | null {
  if (!m.winner_id || !m.loser_id) return null;
  return {
    team1Id: m.team1_id,
    team2Id: m.team2_id,
    winnerId: m.winner_id,
    loserId: m.loser_id,
    scoreTeam1: m.score_team1 ?? 0,
    scoreTeam2: m.score_team2 ?? 0,
  };
}

function teamsToEngine(teams: Team[], results: MatchResult[]): TournamentTeam[] {
  return teams.map((t) => {
    const wins = results.filter((r) => r.winnerId === t.id).length;
    const losses = results.filter((r) => r.loserId === t.id).length;
    return { id: t.id, name: t.name, wins, losses };
  });
}

/* ─── Component ───────────────────────────────────────────────── */

export default function TournamentTab() {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');

  const loadData = useCallback(async () => {
    const [tRes, teamsRes, matchesRes] = await Promise.all([
      supabase.from('tournament').select('*').maybeSingle(),
      supabase.from('teams').select('*'),
      supabase.from('matches').select('*').order('round', { ascending: true }),
    ]);

    const t = tRes.data;
    const allTeams = teamsRes.data ?? [];
    const allMatches = matchesRes.data ?? [];

    setTournament(t);
    setTeams(allTeams);
    setMatches(allMatches);

    // Calculate standings
    const results = allMatches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
    const engineTeams = teamsToEngine(allTeams, results);
    const s = calculateRankings(engineTeams, results);
    setStandings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('admin-tournament')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Build name map
  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  const completedResults = matches
    .map(dbMatchToResult)
    .filter(Boolean) as MatchResult[];

  // Group matches by round
  const roundsMap = new Map<number, Match[]>();
  for (const m of matches) {
    const arr = roundsMap.get(m.round) ?? [];
    arr.push(m);
    roundsMap.set(m.round, arr);
  }
  const rounds = [...roundsMap.entries()].sort(([a], [b]) => a - b);

  const currentRound = tournament?.current_round ?? 0;
  const status = tournament?.status ?? 'not_started';

  async function handleStartTournament() {
    setGenerating(true);
    try {
      if (!tournament) {
        await supabase.from('tournament').insert({
          current_round: 1,
          total_rounds: 7,
          status: 'swiss',
        });
      } else {
        await supabase
          .from('tournament')
          .update({ current_round: 1, status: 'swiss' })
          .eq('id', tournament.id);
      }
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  async function handleGeneratePairings() {
    setGenerating(true);
    try {
      const engineTeams = teamsToEngine(teams, completedResults);
      const pairings = generateSwissPairings(
        engineTeams,
        completedResults,
        currentRound,
      );

      // Insert matches
      const inserts = pairings.pairings.map((p, i) => ({
        round: currentRound,
        team1_id: p.team1Id,
        team2_id: p.team2Id,
        table_number: i + 1,
      }));

      const { error } = await supabase.from('matches').insert(inserts);
      if (error) throw error;
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  async function handleAdvanceRound() {
    if (!tournament) return;
    setGenerating(true);
    try {
      await supabase
        .from('tournament')
        .update({ current_round: currentRound + 1 })
        .eq('id', tournament.id);
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  async function handleStartKnockout() {
    if (!tournament) return;
    setGenerating(true);
    try {
      await supabase
        .from('tournament')
        .update({ status: 'knockout', current_round: 8 })
        .eq('id', tournament.id);
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateKnockout() {
    setGenerating(true);
    try {
      const top8 = standings.slice(0, 8).map((s) => ({
        id: s.id,
        name: s.name,
        wins: s.wins,
        losses: s.losses,
      }));
      const bracket = generateKnockoutBracket(top8);

      // Insert QF matches as round 8
      const qfInserts = bracket.quarterfinals.map((qf, i) => ({
        round: 8,
        team1_id: qf.team1Id!,
        team2_id: qf.team2Id!,
        table_number: i + 1,
      }));
      await supabase.from('matches').insert(qfInserts);
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  // Build a live knockout bracket from matches in rounds >= 8
  const knockoutMatches = matches.filter((m) => m.round >= 8);
  const knockoutResults = knockoutMatches
    .map(dbMatchToResult)
    .filter(Boolean) as MatchResult[];
  let liveBracket: KnockoutBracketType | null = null;

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

      // Try advance QF
      const qfResults = qfMatches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
      if (qfResults.length === 4) {
        liveBracket = advanceKnockoutRound(liveBracket, qfResults, 'quarterfinals');
      }

      // Try advance SF
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

      // Try set final
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

  const finalResult = knockoutMatches.find(
    (m) => m.round === 10 && m.winner_id,
  );
  const champion = finalResult?.winner_id ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <motion.div
          className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border',
            status === 'not_started' && 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
            status === 'swiss' && 'bg-brand-500/10 text-brand-400 border-brand-500/20',
            status === 'knockout' && 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            status === 'finished' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          )}
        >
          {status === 'not_started' && 'Ej startad'}
          {status === 'swiss' && `Swiss — Runda ${currentRound}`}
          {status === 'knockout' && 'Slutspel'}
          {status === 'finished' && 'Avslutad'}
        </div>
        <span className="text-xs text-zinc-600">
          {teams.length} lag · {matches.length} matcher
        </span>

        {/* View toggle */}
        <div className="flex items-center gap-1.5 ml-auto">
          {([
            { key: 'list' as const, label: 'Lista', Icon: List },
            { key: 'map' as const, label: 'Karta', Icon: LayoutGrid },
          ]).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-all border flex items-center gap-1.5',
                view === key
                  ? 'bg-white/[0.08] text-white border-white/[0.12]'
                  : 'text-zinc-600 border-transparent hover:text-zinc-400',
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {status === 'not_started' && teams.length > 0 && (
          <button
            onClick={handleStartTournament}
            disabled={generating}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
              'hover:brightness-110 disabled:opacity-50',
            )}
          >
            {generating ? 'Startar…' : 'Starta turnering'}
          </button>
        )}

        {status === 'swiss' && (
          <>
            {!roundsMap.has(currentRound) && (
              <button
                onClick={handleGeneratePairings}
                disabled={generating}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
                  'hover:brightness-110 disabled:opacity-50',
                )}
              >
                {generating ? 'Genererar…' : `Generera lottning Runda ${currentRound}`}
              </button>
            )}

            {roundsMap.has(currentRound) && currentRound < 7 && (
              <button
                onClick={handleAdvanceRound}
                disabled={generating}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  'bg-white/[0.04] text-zinc-300 border border-white/[0.08]',
                  'hover:text-white disabled:opacity-50',
                )}
              >
                Nästa runda →
              </button>
            )}

            {currentRound >= 7 && roundsMap.has(currentRound) && (
              <button
                onClick={handleStartKnockout}
                disabled={generating}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  'bg-amber-500/15 text-amber-400 border border-amber-500/20',
                  'hover:bg-amber-500/25 disabled:opacity-50',
                )}
              >
                Gå till slutspel →
              </button>
            )}
          </>
        )}

        {status === 'knockout' && !roundsMap.has(8) && (
          <button
            onClick={handleGenerateKnockout}
            disabled={generating}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              'bg-amber-500/15 text-amber-400 border border-amber-500/20',
              'hover:bg-amber-500/25 disabled:opacity-50',
            )}
          >
            {generating ? 'Genererar…' : 'Generera slutspelsträd'}
          </button>
        )}
      </div>

      {/* View content */}
      {view === 'map' ? (
        <div className="space-y-4">
          <TournamentMapView
            rounds={rounds}
            standings={standings}
            teamNameMap={teamNameMap}
            liveBracket={liveBracket}
            knockoutResults={knockoutResults}
            champion={champion}
            totalRounds={7}
            status={status}
            onEditMatch={setEditingMatchId}
          />

          {/* Inline editor for map view */}
          {editingMatchId && (() => {
            const m = matches.find((m) => m.id === editingMatchId);
            if (!m) return null;
            return (
              <MatchResultEditor
                match={m}
                team1Name={teamNameMap.get(m.team1_id) ?? m.team1_id}
                team2Name={teamNameMap.get(m.team2_id) ?? m.team2_id}
                onSaved={() => {
                  setEditingMatchId(null);
                  loadData();
                }}
                onCancel={() => setEditingMatchId(null)}
              />
            );
          })()}
        </div>
      ) : (
        <>
          {/* Knockout bracket */}
          {liveBracket && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-400">Slutspelsträd</h3>
              <KnockoutBracketView
                bracket={liveBracket}
                teamNameMap={teamNameMap}
                results={knockoutResults}
                champion={champion}
              />
            </div>
          )}

          {/* Swiss rounds */}
          {rounds.filter(([r]) => r <= 7).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-400">Swiss-rundor</h3>
              {rounds
                .filter(([r]) => r <= 7)
                .reverse()
                .map(([round, roundMatches]) => (
                  <div key={round} className="space-y-2">
                    <SwissRoundCard
                      round={round}
                      pairings={roundMatches.map((m) => ({
                        team1Id: m.team1_id,
                        team2Id: m.team2_id,
                      }))}
                      results={
                        roundMatches
                          .map(dbMatchToResult)
                          .filter(Boolean) as MatchResult[]
                      }
                      teamNameMap={teamNameMap}
                    />
                    {/* Inline editors */}
                    {roundMatches.map((m) =>
                      editingMatchId === m.id ? (
                        <MatchResultEditor
                          key={m.id}
                          match={m}
                          team1Name={teamNameMap.get(m.team1_id) ?? m.team1_id}
                          team2Name={teamNameMap.get(m.team2_id) ?? m.team2_id}
                          onSaved={() => {
                            setEditingMatchId(null);
                            loadData();
                          }}
                          onCancel={() => setEditingMatchId(null)}
                        />
                      ) : (
                        <button
                          key={m.id}
                          onClick={() => setEditingMatchId(m.id)}
                          className="hidden group-hover:block text-xs text-zinc-600 hover:text-zinc-400 transition"
                        >
                          Redigera
                        </button>
                      ),
                    )}
                  </div>
                ))}
            </div>
          )}

          {/* Standings */}
          {standings.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-400">Ställning</h3>
              <StandingsTable standings={standings} highlightTop={8} />
            </div>
          )}

          {/* Empty state */}
          {teams.length === 0 && (
            <div className="text-center py-16 text-zinc-600">
              <p className="text-lg">Inga lag registrerade</p>
              <p className="text-sm mt-2">Skapa lag i fliken "Lag" först</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
