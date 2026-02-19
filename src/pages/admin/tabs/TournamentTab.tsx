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
  type MatchResult,
  type TeamStanding,
  type KnockoutBracket as KnockoutBracketType,
} from '@/lib/tournament-engine';
import { List, LayoutGrid } from 'lucide-react';
import SwissRoundCard from '../components/SwissRoundCard';
import KnockoutBracketView from '../components/KnockoutBracketView';
import MatchResultEditor from '../components/MatchResultEditor';
import TournamentMapView from '../components/TournamentMapView';
import TournamentFlowCard from '../components/TournamentFlowCard';
import DangerZone from '../components/DangerZone';
import { dbMatchToResult, teamsToEngine } from '../lib/match-utils';
import type { AdminTab } from '@/contexts/AdminTabContextDef';

/* ─── Component ───────────────────────────────────────────────── */

interface TournamentTabProps {
  onTabChange: (tab: AdminTab) => void;
}

export default function TournamentTab({ onTabChange }: TournamentTabProps) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [roundTime, setRoundTime] = useState('');

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
        scheduled_time: roundTime || null,
      }));

      const { error } = await supabase.from('matches').insert(inserts);
      if (error) throw error;
      setRoundTime('');
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
        scheduled_time: roundTime || null,
      }));
      const { error } = await supabase.from('matches').insert(qfInserts);
      if (error) throw error;
      setRoundTime('');
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateSemifinals() {
    if (!tournament) return;
    setGenerating(true);
    try {
      const qfMatches = matches
        .filter((m) => m.round === 8 && m.confirmed)
        .sort((a, b) => (a.table_number ?? 0) - (b.table_number ?? 0));
      const qfWinners = qfMatches.map((m) => m.winner_id!);
      if (qfWinners.length !== 4) return;

      // QF1 winner vs QF2 winner, QF3 winner vs QF4 winner
      const sfInserts = [
        { round: 9, team1_id: qfWinners[0], team2_id: qfWinners[1], table_number: 1, scheduled_time: roundTime || null },
        { round: 9, team1_id: qfWinners[2], team2_id: qfWinners[3], table_number: 2, scheduled_time: roundTime || null },
      ];
      const { error } = await supabase.from('matches').insert(sfInserts);
      if (error) throw error;
      setRoundTime('');
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateFinal() {
    if (!tournament) return;
    setGenerating(true);
    try {
      const sfMatches = matches
        .filter((m) => m.round === 9 && m.confirmed)
        .sort((a, b) => (a.table_number ?? 0) - (b.table_number ?? 0));
      const sfWinners = sfMatches.map((m) => m.winner_id!);
      if (sfWinners.length !== 2) return;

      const { error } = await supabase.from('matches').insert({
        round: 10,
        team1_id: sfWinners[0],
        team2_id: sfWinners[1],
        table_number: 1,
        scheduled_time: roundTime || null,
      });
      if (error) throw error;
      setRoundTime('');
      await loadData();
    } finally {
      setGenerating(false);
    }
  }

  async function handleFinishTournament() {
    if (!tournament) return;
    setGenerating(true);
    try {
      await supabase
        .from('tournament')
        .update({ status: 'finished' })
        .eq('id', tournament.id);
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

  const championName = champion ? teamNameMap.get(champion) ?? null : null;
  const disputed = matches.filter((m) => m.confirmed_by === 'disputed' && !m.confirmed);

  function handleMatchSaved(): void {
    setEditingMatchId(null);
    loadData();
  }

  function handleMatchCancelled(): void {
    setEditingMatchId(null);
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

      {/* Flow Card — always-visible guidance + action */}
      <TournamentFlowCard
        tournament={tournament}
        teams={teams}
        matches={matches}
        roundsMap={roundsMap}
        generating={generating}
        roundTime={roundTime}
        onRoundTimeChange={setRoundTime}
        onStartTournament={handleStartTournament}
        onGeneratePairings={handleGeneratePairings}
        onAdvanceRound={handleAdvanceRound}
        onStartKnockout={handleStartKnockout}
        onGenerateKnockout={handleGenerateKnockout}
        onGenerateSemifinals={handleGenerateSemifinals}
        onGenerateFinal={handleGenerateFinal}
        onFinishTournament={handleFinishTournament}
        onTabChange={onTabChange}
        championName={championName}
      />

      {/* Disputed matches */}
      {disputed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-amber-400">
            Disputerade matcher ({disputed.length})
          </h3>
          <div className="space-y-2">
            {disputed.map((m) => (
              <div key={m.id}>
                {editingMatchId === m.id ? (
                  <MatchResultEditor
                    match={m}
                    team1Name={teamNameMap.get(m.team1_id) ?? m.team1_id}
                    team2Name={teamNameMap.get(m.team2_id) ?? m.team2_id}
                    onSaved={handleMatchSaved}
                    onCancel={handleMatchCancelled}
                  />
                ) : (
                  <button
                    onClick={() => setEditingMatchId(m.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all bg-amber-500/[0.06] border-amber-500/20 hover:bg-amber-500/[0.1]"
                  >
                    <span className="text-sm text-white">
                      {teamNameMap.get(m.team1_id) ?? '?'} vs{' '}
                      {teamNameMap.get(m.team2_id) ?? '?'}
                    </span>
                    <span className="text-xs text-amber-400">
                      R{m.round} · {m.score_team1}–{m.score_team2} · Klicka för att avgöra
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                onSaved={handleMatchSaved}
                onCancel={handleMatchCancelled}
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

          {/* Knockout match list (editable) */}
          {knockoutMatches.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-400">Slutspelsmatcher</h3>
              <div className="rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
                {[
                  { round: 8, label: 'Kvartsfinal' },
                  { round: 9, label: 'Semifinal' },
                  { round: 10, label: 'Final' },
                ]
                  .filter(({ round }) => knockoutMatches.some((m) => m.round === round))
                  .map(({ round, label }) => (
                    <div key={round}>
                      <div className="px-4 py-2 bg-white/[0.02] text-xs font-medium text-zinc-500">
                        {label}
                      </div>
                      {knockoutMatches
                        .filter((m) => m.round === round)
                        .map((m) =>
                          editingMatchId === m.id ? (
                            <div key={m.id} className="px-3 py-2">
                              <MatchResultEditor
                                match={m}
                                team1Name={teamNameMap.get(m.team1_id) ?? m.team1_id}
                                team2Name={teamNameMap.get(m.team2_id) ?? m.team2_id}
                                onSaved={handleMatchSaved}
                                onCancel={handleMatchCancelled}
                              />
                            </div>
                          ) : (
                            <button
                              key={m.id}
                              onClick={() => setEditingMatchId(m.id)}
                              className={cn(
                                'w-full grid grid-cols-[1fr_4.5rem_1fr] gap-2 px-4 py-2.5 text-sm',
                                'hover:bg-white/[0.03] transition-colors cursor-pointer',
                              )}
                            >
                              <span
                                className={cn(
                                  'truncate text-left',
                                  m.winner_id === m.team1_id ? 'text-emerald-400 font-medium' : 'text-white',
                                )}
                              >
                                {teamNameMap.get(m.team1_id) ?? m.team1_id}
                              </span>
                              <span className="text-center font-mono text-zinc-400">
                                {m.score_team1 != null && m.score_team2 != null
                                  ? `${m.score_team1}\u2013${m.score_team2}`
                                  : '\u2013'}
                              </span>
                              <span
                                className={cn(
                                  'truncate text-right',
                                  m.winner_id === m.team2_id ? 'text-emerald-400 font-medium' : 'text-white',
                                )}
                              >
                                {teamNameMap.get(m.team2_id) ?? m.team2_id}
                              </span>
                            </button>
                          ),
                        )}
                    </div>
                  ))}
              </div>
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
                      onMatchClick={(t1, t2) => {
                        const m = roundMatches.find(
                          (m) =>
                            (m.team1_id === t1 && m.team2_id === t2) ||
                            (m.team1_id === t2 && m.team2_id === t1),
                        );
                        if (m) setEditingMatchId(editingMatchId === m.id ? null : m.id);
                      }}
                    />
                    {/* Inline editor */}
                    {roundMatches.map((m) =>
                      editingMatchId === m.id ? (
                        <MatchResultEditor
                          key={m.id}
                          match={m}
                          team1Name={teamNameMap.get(m.team1_id) ?? m.team1_id}
                          team2Name={teamNameMap.get(m.team2_id) ?? m.team2_id}
                          onSaved={handleMatchSaved}
                          onCancel={handleMatchCancelled}
                        />
                      ) : null,
                    )}
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* Danger Zone */}
      <DangerZone
        tournament={tournament}
        currentRound={currentRound}
        onActionComplete={loadData}
      />
    </div>
  );
}
