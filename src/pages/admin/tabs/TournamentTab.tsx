import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match, Tournament } from '@/lib/database.types';
import {
  generateSwissPairings,
  knockoutLabels,
  countByesPerTeam,
  detectUnresolvedCutoffTie,
  applyCutoffTieOrder,
  type MatchResult,
  type TeamStanding,
  type KnockoutBracket as KnockoutBracketType,
} from '@/lib/tournament-engine';
import {
  buildLiveBracket,
  nextKnockoutRoundIndex,
  seedFirstKnockoutRound,
  pairKnockoutWinners,
} from '@/lib/live-knockout';
import { List, LayoutGrid, ChevronUp, ChevronDown } from 'lucide-react';
import SwissRoundCard from '../components/SwissRoundCard';
import KnockoutBracketView from '../components/KnockoutBracketView';
import MatchResultEditor from '../components/MatchResultEditor';
import TournamentMapView from '../components/TournamentMapView';
import TournamentFlowCard from '../components/TournamentFlowCard';
import DangerZone from '../components/DangerZone';
import { byesByRound, dbMatchToResult, standingsFromMatches, teamsToEngine } from '../lib/match-utils';
import { orientSwissPairings, type OrientedPairing } from '@/lib/home-away';
import type { AdminTab } from '@/contexts/AdminTabContextDef';
import { assignTablesAndWaves, getWaveCount, normalizeTableCount } from '@/lib/table-scheduling';
import { getKnockoutStartRound, DEFAULT_KNOCKOUT_SIZE } from '@/lib/constants';

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
  const [roundCount, setRoundCount] = useState(7);
  const [tableCount, setTableCount] = useState(16);
  const [knockoutSize, setKnockoutSize] = useState(DEFAULT_KNOCKOUT_SIZE);
  // Persisted N-way tie ordering, keyed by cutoff → team ids in rank order.
  // A 2-team tie is just N=2; this supersedes the old pairwise RPS flow.
  const [tieOrderByCutoff, setTieOrderByCutoff] = useState<Record<number, string[]>>({});
  const [draftTieOrder, setDraftTieOrder] = useState<string[]>([]);
  const [savingTieOrder, setSavingTieOrder] = useState(false);
  const [tieOrderError, setTieOrderError] = useState('');
  const [tieResolverOpen, setTieResolverOpen] = useState(true);
  const [flowError, setFlowError] = useState('');

  const loadData = useCallback(async () => {
    const [tRes, teamsRes, matchesRes, tieOrderRes] = await Promise.all([
      supabase.from('tournament').select('*').maybeSingle(),
      supabase.from('teams').select('*'),
      supabase
        .from('matches')
        .select('*')
        .order('round', { ascending: true })
        .order('wave', { ascending: true })
        .order('table_number', { ascending: true }),
      supabase.from('tiebreak_order').select('*').order('cutoff').order('rank'),
    ]);

    const t = tRes.data;
    const allTeams = teamsRes.data ?? [];
    const allMatches = matchesRes.data ?? [];

    setTournament(t);
    if (t?.total_rounds) setRoundCount(t.total_rounds);
    if (t?.table_count) setTableCount(t.table_count);
    if (t?.knockout_size) setKnockoutSize(t.knockout_size);
    setTeams(allTeams);
    setMatches(allMatches);
    // Rows arrive sorted by (cutoff, rank), so pushing yields each cutoff's
    // team ids already in rank order.
    const orderMap: Record<number, string[]> = {};
    for (const row of tieOrderRes.data ?? []) {
      (orderMap[row.cutoff] ??= []).push(row.team_id);
    }
    setTieOrderByCutoff(orderMap);

    // Standings (bye-aware: a bye is a win + cup credit — issue #26)
    setStandings(standingsFromMatches(allTeams, allMatches));
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
    const channel = supabase
      .channel('admin-tournament')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament' }, () =>
        loadData(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => loadData())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Build name map
  const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));
  // Knockout starts the round after the last Swiss round; once started, total_rounds
  // is authoritative (falls back to the local round-count input pre-start).
  const knockoutStartRound = getKnockoutStartRound(tournament?.total_rounds ?? roundCount);
  // Teams advancing into the knockout bracket; once started, knockout_size is
  // authoritative (falls back to the local size input pre-start). Always a power of 2,
  // so the bracket has log2(size) rounds (e.g. 8 → Kvarts/Semi/Final).
  const playoffSize = tournament?.knockout_size ?? knockoutSize;
  const numKnockoutRounds = Math.log2(playoffSize);
  const completedResults = matches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
  // Per-round bye team (odd field only); knockout rounds never register a bye.
  const swissByeByRound = byesByRound(teams, matches);
  // The cutoff tie only matters at the Swiss→knockout seeding step: all Swiss
  // rounds are done (status is 'knockout') but the first knockout round isn't
  // generated yet. Outside that step the detection would fire spuriously — e.g.
  // before play starts every team is 0–0 with equal cup diff, so the whole field
  // reads as one big tie.
  const atKnockoutSeedingStep =
    tournament?.status === 'knockout' && !matches.some((m) => m.round === knockoutStartRound);
  const unresolvedCutoffTie = atKnockoutSeedingStep
    ? detectUnresolvedCutoffTie(standings, completedResults, playoffSize)
    : null;
  const tieGroupIds = unresolvedCutoffTie?.teamIds ?? null;
  const storedTieOrder = tieOrderByCutoff[playoffSize] ?? [];

  // The tied group occupies a contiguous run of standings slots starting at this
  // placement; the cutoff (Top playoffSize) falls somewhere inside it, so draft
  // position k lands at placement firstTieRank + k and qualifies iff that is ≤ playoffSize.
  const firstTieRank = tieGroupIds ? standings.findIndex((s) => tieGroupIds.includes(s.id)) + 1 : 0;

  // A tie is resolved once a stored order covers exactly the tied group (any N≥2).
  const tieResolved =
    tieGroupIds !== null &&
    storedTieOrder.length === tieGroupIds.length &&
    new Set(storedTieOrder).size === tieGroupIds.length &&
    tieGroupIds.every((id) => storedTieOrder.includes(id));

  // Any unresolved cutoff tie blocks knockout generation — otherwise the bracket
  // would silently use the arbitrary alphabetical fallback to decide who makes
  // Top 8. The admin resolves it by recording a full order below (issues #24, #27).
  const knockoutBlockedByTie = unresolvedCutoffTie !== null && !tieResolved;

  // Seed the editable draft order from the persisted order if it covers the group,
  // otherwise from the current standings order of the tied teams. Re-seed only when
  // the tied group or the persisted order changes (tracked via primitive keys) — not
  // on every standings re-render — so an in-progress reordering isn't clobbered.
  const tieGroupKey = tieGroupIds ? [...tieGroupIds].sort().join(',') : '';
  const storedTieOrderKey = storedTieOrder.join(',');
  useEffect(() => {
    if (!tieGroupIds) {
      setDraftTieOrder([]);
      return;
    }
    const groupSet = new Set(tieGroupIds);
    setDraftTieOrder(
      tieResolved
        ? [...storedTieOrder]
        : standings.filter((s) => groupSet.has(s.id)).map((s) => s.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tieGroupKey, storedTieOrderKey]);

  function moveTieTeam(index: number, dir: -1 | 1): void {
    setDraftTieOrder((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSaveTieOrder(): Promise<void> {
    if (draftTieOrder.length === 0) return;
    setTieOrderError('');
    setSavingTieOrder(true);
    try {
      const adminCode = sessionStorage.getItem('adminCode');
      if (!adminCode) throw new Error('Logga in som admin igen');
      // Writes go through an admin-gated RPC; tiebreak_order is not directly
      // writable with the public anon key (issues #18, #24, #27). The RPC clears
      // and rewrites the cutoff's order atomically.
      const { error } = await supabase.rpc('set_tiebreak_order', {
        p_cutoff: playoffSize,
        p_team_ids: draftTieOrder,
        admin_code: adminCode,
      });
      if (error) throw error;
      setTieOrderByCutoff((prev) => ({ ...prev, [playoffSize]: [...draftTieOrder] }));
    } catch (err) {
      setTieOrderError(err instanceof Error ? err.message : 'Kunde inte spara ordningen');
    } finally {
      setSavingTieOrder(false);
    }
  }

  function getPlayoffQualifiedStandings(): TeamStanding[] {
    if (!tieResolved) return standings;
    return applyCutoffTieOrder(standings, storedTieOrder);
  }

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
    setFlowError('');
    setGenerating(true);
    try {
      const adminCode = sessionStorage.getItem('adminCode');
      if (!adminCode) throw new Error('Logga in som admin igen');
      // Clamp the knockout size to the largest power of 2 that fits the field, so a
      // leftover default can't exceed the number of teams.
      const maxKnockout = teams.length >= 2 ? 2 ** Math.floor(Math.log2(teams.length)) : 2;
      const effectiveKnockoutSize = Math.min(knockoutSize, maxKnockout);
      // Clamp Swiss rounds to the number of distinct opponents (teams - 1). The round
      // input's `max` only applies while editing, so an untouched default could
      // otherwise exceed the field and force rematches.
      const effectiveRoundCount = Math.min(roundCount, Math.max(1, teams.length - 1));
      const { error } = await supabase.rpc('admin_set_tournament', {
        admin_code: adminCode,
        p_current_round: 1,
        p_total_rounds: effectiveRoundCount,
        p_table_count: tableCount,
        p_knockout_size: effectiveKnockoutSize,
        p_status: 'swiss',
      });
      if (error) throw error;
      setKnockoutSize(effectiveKnockoutSize);
      setRoundCount(effectiveRoundCount);
      await loadData();
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : 'Kunde inte starta turneringen');
    } finally {
      setGenerating(false);
    }
  }

  async function handleGeneratePairings() {
    setFlowError('');
    setGenerating(true);
    try {
      const activeTableCount = normalizeTableCount(tournament?.table_count ?? tableCount);
      // Prior-round byes count as wins, so the bye team lands in the right win
      // group when seeding this round (issue #26).
      const priorByes = countByesPerTeam(byesByRound(teams, matches));
      const engineTeams = teamsToEngine(teams, completedResults, priorByes);
      const pairings = generateSwissPairings(engineTeams, completedResults, currentRound);

      const swissHistory = matches.filter(
        (m) => m.round <= (tournament?.total_rounds ?? roundCount),
      );
      const orientedPairings = orientSwissPairings(pairings.pairings, swissHistory);
      const scheduledPairings = assignTablesAndWaves(orientedPairings, activeTableCount);

      // team1_id = home team, team2_id = away team
      const inserts = scheduledPairings.map((p) => ({
        round: currentRound,
        wave: p.wave,
        team1_id: p.homeTeamId,
        team2_id: p.awayTeamId,
        table_number: p.tableNumber,
        scheduled_time: roundTime || null,
      }));

      const { error } = await supabase.rpc('admin_create_matches', {
        admin_code: sessionStorage.getItem('adminCode') ?? '',
        rows: inserts,
      });
      if (error) throw error;
      setRoundTime('');
      await loadData();
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : 'Kunde inte generera matcher');
    } finally {
      setGenerating(false);
    }
  }

  async function handleAdvanceRound() {
    if (!tournament) return;
    setFlowError('');
    setGenerating(true);
    try {
      const { error } = await supabase.rpc('admin_set_tournament', {
        admin_code: sessionStorage.getItem('adminCode') ?? '',
        p_current_round: currentRound + 1,
      });
      if (error) throw error;
      await loadData();
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : 'Kunde inte gå vidare till nästa runda');
    } finally {
      setGenerating(false);
    }
  }

  async function handleStartKnockout() {
    if (!tournament) return;
    setFlowError('');
    setGenerating(true);
    try {
      const { error } = await supabase.rpc('admin_set_tournament', {
        admin_code: sessionStorage.getItem('adminCode') ?? '',
        p_status: 'knockout',
        p_current_round: knockoutStartRound,
      });
      if (error) throw error;
      await loadData();
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : 'Kunde inte starta slutspelet');
    } finally {
      setGenerating(false);
    }
  }

  // Generate the next knockout round: the seeded first round, or pair the previous
  // round's winners. One handler drives the whole bracket (QF → … → Final) for any
  // power-of-2 knockout size.
  async function handleGenerateNextKnockoutRound() {
    setFlowError('');
    setGenerating(true);
    try {
      const activeTableCount = normalizeTableCount(tournament?.table_count ?? tableCount);

      // Knockout rounds live at knockoutStartRound .. +(numKnockoutRounds - 1).
      const nextRoundIndex = nextKnockoutRoundIndex(matches, knockoutStartRound);
      if (nextRoundIndex >= numKnockoutRounds) return; // bracket already complete
      const targetRound = knockoutStartRound + nextRoundIndex;

      let pairings: OrientedPairing[];

      if (nextRoundIndex === 0) {
        // First round: seed the top `playoffSize` standings into the bracket.
        if (knockoutBlockedByTie) return;
        const playoffStandings = getPlayoffQualifiedStandings();
        const seeds = playoffStandings.slice(0, playoffSize).map((s) => ({
          id: s.id,
          name: s.name,
          wins: s.wins,
          losses: s.losses,
        }));
        if (seeds.length !== playoffSize) {
          throw new Error(`Behöver ${playoffSize} lag för slutspelet, har ${seeds.length}`);
        }
        // Tiebreak-resolved ranks so a team promoted past a cutoff tie is seeded by
        // its resolved position, not its pre-resolution rank.
        const standingsRankMap = new Map(playoffStandings.map((s) => [s.id, s.rank]));
        pairings = seedFirstKnockoutRound(seeds, matches, knockoutStartRound, standingsRankMap);
      } else {
        // Later round: pair the previous round's confirmed winners.
        const prevConfirmed = matches.filter(
          (m) => m.round === knockoutStartRound + nextRoundIndex - 1 && m.confirmed,
        );
        if (prevConfirmed.length !== playoffSize >> nextRoundIndex) return; // round not decided
        const standingsRankMap = new Map(standings.map((s) => [s.id, s.rank]));
        pairings = pairKnockoutWinners(
          prevConfirmed,
          targetRound,
          knockoutStartRound,
          matches,
          standingsRankMap,
        );
      }

      const scheduled = assignTablesAndWaves(pairings, activeTableCount);
      const inserts = scheduled.map((p) => ({
        round: targetRound,
        wave: p.wave,
        team1_id: p.homeTeamId,
        team2_id: p.awayTeamId,
        table_number: p.tableNumber,
        scheduled_time: roundTime || null,
      }));
      const { error } = await supabase.rpc('admin_create_matches', {
        admin_code: sessionStorage.getItem('adminCode') ?? '',
        rows: inserts,
      });
      if (error) throw error;
      setRoundTime('');
      await loadData();
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : 'Kunde inte generera slutspelsrundan');
    } finally {
      setGenerating(false);
    }
  }

  async function handleFinishTournament() {
    if (!tournament) return;
    setFlowError('');
    setGenerating(true);
    try {
      const { error } = await supabase.rpc('admin_set_tournament', {
        admin_code: sessionStorage.getItem('adminCode') ?? '',
        p_status: 'finished',
      });
      if (error) throw error;
      await loadData();
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : 'Kunde inte avsluta turneringen');
    } finally {
      setGenerating(false);
    }
  }

  // Build a live knockout bracket from matches in the knockout rounds
  const knockoutMatches = matches.filter((m) => m.round >= knockoutStartRound);
  const knockoutResults = knockoutMatches.map(dbMatchToResult).filter(Boolean) as MatchResult[];

  // Live bracket from the generated match rows (null until the first round exists).
  const liveBracket: KnockoutBracketType | null =
    status === 'knockout' ? buildLiveBracket(knockoutMatches, knockoutStartRound, playoffSize) : null;

  const lastKnockoutRound = knockoutStartRound + numKnockoutRounds - 1;
  const finalResult = knockoutMatches.find((m) => m.round === lastKnockoutRound && m.winner_id);
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

  const championName = champion ? (teamNameMap.get(champion) ?? null) : null;
  const disputed = matches.filter((m) => m.confirmed_by === 'disputed' && !m.confirmed);
  const schedulePreview = {
    matchCount: Math.floor(teams.length / 2),
    waveCount: getWaveCount(Math.floor(teams.length / 2), tableCount),
  };

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
          {[
            { key: 'list' as const, label: 'Lista', Icon: List },
            { key: 'map' as const, label: 'Karta', Icon: LayoutGrid },
          ].map(({ key, label, Icon }) => (
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

      {/* Scoring HUD */}
      <div className="flex items-center gap-4 px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[11px] font-mono text-zinc-500">
        <span className="text-zinc-600 uppercase tracking-wider text-[10px]">Ranking</span>
        <span>
          <span className="text-zinc-300">1.</span> Vinster
        </span>
        <span>
          <span className="text-zinc-300">2.</span> Cup diff
        </span>
        <span>
          <span className="text-zinc-300">3.</span> Inbördes möte (2 lag)
        </span>
      </div>

      {unresolvedCutoffTie && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 space-y-3">
          <button
            type="button"
            onClick={() => setTieResolverOpen((v) => !v)}
            aria-expanded={tieResolverOpen}
            className="flex w-full items-start gap-2 text-left"
          >
            <span className="text-sm text-amber-300 flex-1">
              ⚠ Oavgjort vid slutspelsgränsen (Topp {playoffSize}).{' '}
              {unresolvedCutoffTie.teamIds.length} lag är lika på vinster och cup diff och kan inte
              avgöras automatiskt.
              {tieResolved && <span className="text-emerald-300"> ✓ Ordning sparad.</span>}
            </span>
            {tieResolverOpen ? (
              <ChevronUp size={16} className="mt-0.5 shrink-0 text-amber-300/70" />
            ) : (
              <ChevronDown size={16} className="mt-0.5 shrink-0 text-amber-300/70" />
            )}
          </button>
          {tieResolverOpen && (
            <div className="text-xs text-amber-200/90">
              Kör sten-sax-påse (eller en tiebreak-match) framför admins och sätt slutordningen
              nedan. Lagen ovanför gränsen går till slutspel (Topp {playoffSize}), lagen under
              slås ut. Slutspelet låses upp när ordningen sparats.
            </div>
          )}
          {tieResolverOpen && (
            <div className="space-y-1.5">
              {draftTieOrder.map((teamId, i) => {
                const placement = firstTieRank + i;
                const qualifies = placement <= playoffSize;
                return (
                  <div key={teamId}>
                    <div
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-lg border',
                        qualifies
                          ? 'border-emerald-400/25 bg-emerald-400/[0.06]'
                          : 'border-white/[0.08] bg-white/[0.02] opacity-70',
                      )}
                    >
                      <span className="font-mono text-xs text-zinc-400 w-6">#{placement}</span>
                      <span className="text-sm text-zinc-200 flex-1">
                        {teamNameMap.get(teamId) ?? teamId}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded',
                          qualifies ? 'text-emerald-300 bg-emerald-400/10' : 'text-zinc-500',
                        )}
                      >
                        {qualifies ? 'Slutspel' : 'Utslagen'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveTieTeam(i, -1)}
                          disabled={i === 0 || savingTieOrder}
                          aria-label="Flytta upp"
                          className="p-1 rounded-md border border-white/[0.1] text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveTieTeam(i, 1)}
                          disabled={i === draftTieOrder.length - 1 || savingTieOrder}
                          aria-label="Flytta ner"
                          className="p-1 rounded-md border border-white/[0.1] text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                    {placement === playoffSize && i < draftTieOrder.length - 1 && (
                      <div className="flex items-center gap-2 py-1 px-1 text-[10px] uppercase tracking-wider text-amber-300/70">
                        <span className="flex-1 border-t border-amber-400/30" />
                        Slutspelsgräns
                        <span className="flex-1 border-t border-amber-400/30" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {tieResolverOpen && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveTieOrder()}
                disabled={savingTieOrder || draftTieOrder.length === 0}
                className="px-3 py-1.5 rounded-lg text-xs border border-amber-300/50 bg-amber-400/20 text-amber-100 hover:bg-amber-400/30 transition-all disabled:opacity-60"
              >
                {savingTieOrder ? 'Sparar…' : 'Spara ordning'}
              </button>
              {tieResolved && (
                <span className="text-xs text-emerald-300">
                  ✓ Ordning sparad — slutspelet kan genereras.
                </span>
              )}
            </div>
          )}
          {tieResolverOpen && tieOrderError && (
            <p className="text-red-400 text-sm">{tieOrderError}</p>
          )}
        </div>
      )}

      {/* Flow Card — always-visible guidance + action */}
      <TournamentFlowCard
        tournament={tournament}
        teams={teams}
        roundsMap={roundsMap}
        generating={generating}
        roundTime={roundTime}
        onRoundTimeChange={setRoundTime}
        roundCount={roundCount}
        tableCount={tableCount}
        knockoutSize={knockoutSize}
        schedulePreview={schedulePreview}
        onRoundCountChange={setRoundCount}
        onTableCountChange={setTableCount}
        onKnockoutSizeChange={setKnockoutSize}
        onStartTournament={handleStartTournament}
        onGeneratePairings={handleGeneratePairings}
        onAdvanceRound={handleAdvanceRound}
        onStartKnockout={handleStartKnockout}
        onGenerateNextKnockoutRound={handleGenerateNextKnockoutRound}
        knockoutBlockedByTie={knockoutBlockedByTie}
        onFinishTournament={handleFinishTournament}
        onTabChange={onTabChange}
        championName={championName}
      />
      {flowError && <p className="text-red-400 text-sm">{flowError}</p>}

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
                      {teamNameMap.get(m.team1_id) ?? '?'} vs {teamNameMap.get(m.team2_id) ?? '?'}
                    </span>
                    <span className="text-xs text-amber-400">
                      R{m.round} · P{m.wave} · B{m.table_number ?? '—'} · {m.score_team1}–
                      {m.score_team2} · Klicka för att avgöra
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
            totalRounds={tournament?.total_rounds ?? 7}
            status={status}
            onEditMatch={setEditingMatchId}
          />

          {/* Inline editor for map view */}
          {(() => {
            const editMatch = editingMatchId ? matches.find((m) => m.id === editingMatchId) : null;
            if (!editMatch) return null;
            return (
              <MatchResultEditor
                match={editMatch}
                team1Name={teamNameMap.get(editMatch.team1_id) ?? editMatch.team1_id}
                team2Name={teamNameMap.get(editMatch.team2_id) ?? editMatch.team2_id}
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
                {knockoutLabels(playoffSize)
                  .map((label, r) => ({ round: knockoutStartRound + r, label }))
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
                                  m.winner_id === m.team1_id
                                    ? 'text-emerald-400 font-medium'
                                    : 'text-white',
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
                                  m.winner_id === m.team2_id
                                    ? 'text-emerald-400 font-medium'
                                    : 'text-white',
                                )}
                              >
                                {teamNameMap.get(m.team2_id) ?? m.team2_id}
                              </span>
                              <span className="col-span-3 text-center text-[11px] text-zinc-600 font-mono">
                                P{m.wave} · B{m.table_number ?? '—'}
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
          {rounds.filter(([r]) => r <= (tournament?.total_rounds ?? roundCount)).length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-400">Swiss-rundor</h3>
              {rounds
                .filter(([r]) => r <= (tournament?.total_rounds ?? roundCount))
                .reverse()
                .map(([round, roundMatches]) => (
                  <SwissRoundCard
                    key={round}
                    round={round}
                    bye={swissByeByRound.get(round) ?? null}
                    pairings={roundMatches.map((m) => ({
                      team1Id: m.team1_id,
                      team2Id: m.team2_id,
                    }))}
                    results={roundMatches.map(dbMatchToResult).filter(Boolean) as MatchResult[]}
                    teamNameMap={teamNameMap}
                    editingMatchId={editingMatchId}
                    matches={roundMatches}
                    onMatchSaved={handleMatchSaved}
                    onMatchCancelled={handleMatchCancelled}
                    onMatchClick={(t1, t2) => {
                      const found = roundMatches.find(
                        (rm) =>
                          (rm.team1_id === t1 && rm.team2_id === t2) ||
                          (rm.team1_id === t2 && rm.team2_id === t1),
                      );
                      if (found) setEditingMatchId(editingMatchId === found.id ? null : found.id);
                    }}
                  />
                ))}
            </div>
          )}
        </>
      )}

      {/* Danger Zone */}
      <DangerZone tournament={tournament} currentRound={currentRound} onActionComplete={loadData} />
    </div>
  );
}
