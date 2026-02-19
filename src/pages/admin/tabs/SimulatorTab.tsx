import { useState, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  generateFakeTeams,
  simulateMatchResult,
  simulateMatchResultWithBias,
  generateSkillRatings,
  generateSimBracketTop4,
  generateSimBracketTop16,
  advanceSimKnockoutRound,
  computeVerificationStats,
  runBatchSimulation,
  DEFAULT_CONFIG,
  type SimConfig,
  type SimBracket,
  type BatchResults,
} from '@/lib/simulator';
import {
  generateSwissPairings,
  generateKnockoutBracket,
  advanceKnockoutRound,
  calculateRankings,
  type TournamentTeam,
  type MatchResult,
  type Pairing,
  type RoundPairings,
  type KnockoutBracket as KnockoutBracketType,
  type TeamStanding,
  type BracketSlot,
} from '@/lib/tournament-engine';
import type { Match } from '@/lib/database.types';
import StandingsTable from '../components/StandingsTable';
import SwissRoundCard from '../components/SwissRoundCard';
import KnockoutBracketView from '../components/KnockoutBracketView';
import TournamentMapView from '../components/TournamentMapView';

/* ─── State Machine ───────────────────────────────────────────── */

type SimPhase =
  | 'idle'
  | 'swiss_pairings'
  | 'swiss_results'
  | 'swiss_complete'
  | 'standings'
  // Top-16 only
  | 'knockout_r16'
  | 'knockout_r16_results'
  // Top-8 and top-16
  | 'knockout_qf'
  | 'knockout_qf_results'
  // All knockout sizes
  | 'knockout_sf'
  | 'knockout_sf_results'
  | 'knockout_final'
  | 'knockout_final_results'
  | 'champion';

type Speed = 'fast' | 'normal' | 'slow';

interface SimState {
  phase: SimPhase;
  config: SimConfig;
  teams: TournamentTeam[];
  teamNameMap: Map<string, string>;
  skillRatings: Map<string, number> | null;
  currentRound: number;
  allResults: MatchResult[];
  roundPairings: RoundPairings | null;
  roundResults: MatchResult[];
  revealedCount: number;
  roundHistory: { round: number; results: MatchResult[] }[];
  standings: TeamStanding[];
  // Top-8 knockout (existing KnockoutBracket)
  bracket: KnockoutBracketType | null;
  // Variable-size knockout (SimBracket for top-4 and top-16)
  simBracket: SimBracket | null;
  simKnockoutRoundIndex: number;
  knockoutResults: MatchResult[];
  champion: string | null;
  autoPlay: boolean;
  speed: Speed;
  // Match overrides
  matchOverrides: Map<string, MatchResult>;
  editingMatch: { team1Id: string; team2Id: string } | null;
}

type SimAction =
  | { type: 'SET_CONFIG'; config: Partial<SimConfig> }
  | { type: 'GENERATE_TEAMS' }
  | { type: 'STEP' }
  | { type: 'SKIP_TO_STANDINGS' }
  | { type: 'SKIP_TO_KNOCKOUT' }
  | { type: 'TOGGLE_AUTOPLAY' }
  | { type: 'SET_SPEED'; speed: Speed }
  | { type: 'OVERRIDE_MATCH'; result: MatchResult }
  | { type: 'CLEAR_OVERRIDE' }
  | { type: 'SET_EDITING_MATCH'; match: { team1Id: string; team2Id: string } | null }
  | { type: 'RESET' };

function makeInitialState(): SimState {
  return {
    phase: 'idle',
    config: { ...DEFAULT_CONFIG },
    teams: [],
    teamNameMap: new Map(),
    skillRatings: null,
    currentRound: 0,
    allResults: [],
    roundPairings: null,
    roundResults: [],
    revealedCount: 0,
    roundHistory: [],
    standings: [],
    bracket: null,
    simBracket: null,
    simKnockoutRoundIndex: 0,
    knockoutResults: [],
    champion: null,
    autoPlay: false,
    speed: 'normal',
    matchOverrides: new Map(),
    editingMatch: null,
  };
}

const INITIAL_STATE = makeInitialState();

/* ─── Pairing key helper ──────────────────────────────────────── */

function pKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

/* ─── Simulate one match (respecting overrides + bias) ────────── */

function simMatch(
  pairing: Pairing,
  overrides: Map<string, MatchResult>,
  skillRatings: Map<string, number> | null,
): MatchResult {
  const key = pKey(pairing.team1Id, pairing.team2Id);
  const override = overrides.get(key);
  if (override) return override;
  return skillRatings
    ? simulateMatchResultWithBias(pairing, skillRatings)
    : simulateMatchResult(pairing);
}

/* ─── Run remaining Swiss rounds synchronously ────────────────── */

function applyRoundResults(
  s: SimState,
  results: MatchResult[],
  round: number,
  bye: string | null,
): SimState {
  let updatedTeams = s.teams.map((t) => {
    const won = results.filter((r) => r.winnerId === t.id).length;
    const lost = results.filter((r) => r.loserId === t.id).length;
    return { ...t, wins: t.wins + won, losses: t.losses + lost };
  });
  if (bye) {
    updatedTeams = updatedTeams.map((t) =>
      t.id === bye ? { ...t, wins: t.wins + 1 } : t,
    );
  }
  return {
    ...s,
    teams: updatedTeams,
    allResults: [...s.allResults, ...results],
    roundResults: results,
    roundHistory: [...s.roundHistory, { round, results }],
  };
}

function runRemainingSwiss(state: SimState): SimState {
  let s = { ...state };
  // If we're mid-round, finish it first
  if (s.phase === 'swiss_pairings') {
    const results = s.roundPairings!.pairings.map((p) =>
      simMatch(p, s.matchOverrides, s.skillRatings),
    );
    s = applyRoundResults(s, results, s.currentRound, s.roundPairings!.bye);
  } else if (s.phase === 'swiss_results') {
    // Reuse already-simulated results instead of re-simulating
    s = applyRoundResults(s, s.roundResults, s.currentRound, s.roundPairings!.bye);
  } else if (s.phase === 'swiss_complete') {
    s = {
      ...s,
      roundHistory: [
        ...s.roundHistory,
        { round: s.currentRound, results: s.roundResults },
      ],
    };
  }

  // Run remaining rounds
  while (s.currentRound < s.config.swissRounds) {
    const nextRound = s.currentRound + 1;
    const rp = generateSwissPairings(s.teams, s.allResults, nextRound);
    const results = rp.pairings.map((p) =>
      simMatch(p, s.matchOverrides, s.skillRatings),
    );
    s = applyRoundResults(s, results, nextRound, rp.bye);
    s = { ...s, currentRound: nextRound };
  }

  const standings = calculateRankings(s.teams, s.allResults);
  return {
    ...s,
    phase: 'standings',
    standings,
    roundPairings: null,
    revealedCount: 0,
    autoPlay: false,
    editingMatch: null,
  };
}

/* ─── Generate knockout bracket based on config ───────────────── */

function generateBracketForConfig(
  config: SimConfig,
  standings: TeamStanding[],
): Pick<SimState, 'bracket' | 'simBracket' | 'simKnockoutRoundIndex'> & { firstPhase: SimPhase } {
  const topN = standings.slice(0, config.knockoutSize).map((s) => ({
    id: s.id,
    name: s.name,
    wins: s.wins,
    losses: s.losses,
  }));

  if (config.knockoutSize === 8) {
    const bracket = generateKnockoutBracket(topN);
    return { bracket, simBracket: null, simKnockoutRoundIndex: 0, firstPhase: 'knockout_qf' };
  } else if (config.knockoutSize === 4) {
    const simBracket = generateSimBracketTop4(topN);
    return { bracket: null, simBracket, simKnockoutRoundIndex: 0, firstPhase: 'knockout_sf' };
  } else {
    const simBracket = generateSimBracketTop16(topN);
    return { bracket: null, simBracket, simKnockoutRoundIndex: 0, firstPhase: 'knockout_r16' };
  }
}

/* ─── Reducer ─────────────────────────────────────────────────── */

function reducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case 'SET_CONFIG': {
      if (state.phase !== 'idle') return state;
      return { ...state, config: { ...state.config, ...action.config } };
    }

    case 'GENERATE_TEAMS': {
      const teams = generateFakeTeams(state.config.teamCount);
      const nameMap = new Map(teams.map((t) => [t.id, t.name]));
      const skillRatings = state.config.strengthBias
        ? generateSkillRatings(teams)
        : null;
      const pairings = generateSwissPairings(teams, [], 1);
      return {
        ...makeInitialState(),
        phase: 'swiss_pairings',
        config: state.config,
        teams,
        teamNameMap: nameMap,
        skillRatings,
        currentRound: 1,
        roundPairings: pairings,
        speed: state.speed,
        autoPlay: state.autoPlay,
      };
    }

    case 'STEP': {
      switch (state.phase) {
        case 'swiss_pairings': {
          const results = state.roundPairings!.pairings.map((p) =>
            simMatch(p, state.matchOverrides, state.skillRatings),
          );
          return {
            ...state,
            phase: 'swiss_results',
            roundResults: results,
            revealedCount: 1,
            editingMatch: null,
          };
        }

        case 'swiss_results': {
          if (state.revealedCount < state.roundResults.length) {
            return { ...state, revealedCount: state.revealedCount + 1 };
          }
          const updatedTeams = state.teams.map((t) => {
            const won = state.roundResults.filter((r) => r.winnerId === t.id).length;
            const lost = state.roundResults.filter((r) => r.loserId === t.id).length;
            return { ...t, wins: t.wins + won, losses: t.losses + lost };
          });
          const newAllResults = [...state.allResults, ...state.roundResults];
          return {
            ...state,
            phase: 'swiss_complete',
            teams: updatedTeams,
            allResults: newAllResults,
          };
        }

        case 'swiss_complete': {
          const updatedHistory = [
            ...state.roundHistory,
            { round: state.currentRound, results: state.roundResults },
          ];
          if (state.currentRound < state.config.swissRounds) {
            const nextRound = state.currentRound + 1;
            const pairings = generateSwissPairings(
              state.teams,
              state.allResults,
              nextRound,
            );
            return {
              ...state,
              phase: 'swiss_pairings',
              currentRound: nextRound,
              roundPairings: pairings,
              roundResults: [],
              revealedCount: 0,
              roundHistory: updatedHistory,
            };
          }
          const standings = calculateRankings(state.teams, state.allResults);
          return { ...state, phase: 'standings', standings, roundHistory: updatedHistory };
        }

        case 'standings': {
          const { bracket, simBracket, simKnockoutRoundIndex, firstPhase } =
            generateBracketForConfig(state.config, state.standings);
          return { ...state, phase: firstPhase, bracket, simBracket, simKnockoutRoundIndex };
        }

        // ── Top-16 R16 ──
        case 'knockout_r16': {
          const slots = state.simBracket!.rounds[0];
          if (slots.some((s) => !s.team1Id || !s.team2Id)) return state;
          const results = slots.map((s) =>
            simMatch({ team1Id: s.team1Id!, team2Id: s.team2Id! }, state.matchOverrides, state.skillRatings),
          );
          const advanced = advanceSimKnockoutRound(state.simBracket!, results, 0);
          return {
            ...state,
            phase: 'knockout_r16_results',
            simBracket: advanced,
            knockoutResults: [...state.knockoutResults, ...results],
          };
        }
        case 'knockout_r16_results':
          return { ...state, phase: 'knockout_qf' };

        // ── QF (top-8 uses existing bracket, top-16 uses simBracket) ──
        case 'knockout_qf': {
          if (state.bracket) {
            // Top-8 path
            const results = state.bracket.quarterfinals.map((qf) =>
              simMatch({ team1Id: qf.team1Id!, team2Id: qf.team2Id! }, state.matchOverrides, state.skillRatings),
            );
            const bracket = advanceKnockoutRound(state.bracket, results, 'quarterfinals');
            return {
              ...state,
              phase: 'knockout_qf_results',
              bracket,
              knockoutResults: [...state.knockoutResults, ...results],
            };
          }
          // Top-16 path (QF is round index 1)
          const qfSlots = state.simBracket!.rounds[1];
          if (qfSlots.some((s) => !s.team1Id || !s.team2Id)) return state;
          const results = qfSlots.map((s) =>
            simMatch({ team1Id: s.team1Id!, team2Id: s.team2Id! }, state.matchOverrides, state.skillRatings),
          );
          const advanced = advanceSimKnockoutRound(state.simBracket!, results, 1);
          return {
            ...state,
            phase: 'knockout_qf_results',
            simBracket: advanced,
            knockoutResults: [...state.knockoutResults, ...results],
          };
        }
        case 'knockout_qf_results':
          return { ...state, phase: 'knockout_sf' };

        // ── SF ──
        case 'knockout_sf': {
          if (state.bracket) {
            const results = state.bracket.semifinals.map((sf) =>
              simMatch({ team1Id: sf.team1Id!, team2Id: sf.team2Id! }, state.matchOverrides, state.skillRatings),
            );
            const bracket = advanceKnockoutRound(state.bracket, results, 'semifinals');
            return {
              ...state,
              phase: 'knockout_sf_results',
              bracket,
              knockoutResults: [...state.knockoutResults, ...results],
            };
          }
          // SimBracket SF
          const sfRoundIdx = state.config.knockoutSize === 4 ? 0 : 2;
          const sfSlots = state.simBracket!.rounds[sfRoundIdx];
          if (sfSlots.some((s) => !s.team1Id || !s.team2Id)) return state;
          const results = sfSlots.map((s) =>
            simMatch({ team1Id: s.team1Id!, team2Id: s.team2Id! }, state.matchOverrides, state.skillRatings),
          );
          const advanced = advanceSimKnockoutRound(state.simBracket!, results, sfRoundIdx);
          return {
            ...state,
            phase: 'knockout_sf_results',
            simBracket: advanced,
            knockoutResults: [...state.knockoutResults, ...results],
          };
        }
        case 'knockout_sf_results':
          return { ...state, phase: 'knockout_final' };

        // ── Final ──
        case 'knockout_final': {
          if (state.bracket) {
            const f = state.bracket.final;
            if (!f.team1Id || !f.team2Id) return state;
            const result = simMatch({ team1Id: f.team1Id, team2Id: f.team2Id }, state.matchOverrides, state.skillRatings);
            return {
              ...state,
              phase: 'knockout_final_results',
              knockoutResults: [...state.knockoutResults, result],
            };
          }
          const finalRoundIdx = state.simBracket!.rounds.length - 1;
          const finalSlot = state.simBracket!.rounds[finalRoundIdx][0];
          if (!finalSlot.team1Id || !finalSlot.team2Id) return state;
          const result = simMatch(
            { team1Id: finalSlot.team1Id, team2Id: finalSlot.team2Id },
            state.matchOverrides,
            state.skillRatings,
          );
          return {
            ...state,
            phase: 'knockout_final_results',
            knockoutResults: [...state.knockoutResults, result],
          };
        }

        case 'knockout_final_results': {
          const lastResult = state.knockoutResults[state.knockoutResults.length - 1];
          return { ...state, phase: 'champion', champion: lastResult.winnerId };
        }

        default:
          return state;
      }
    }

    case 'SKIP_TO_STANDINGS': {
      const isSwiss = ['swiss_pairings', 'swiss_results', 'swiss_complete'].includes(state.phase);
      if (!isSwiss) return state;
      return runRemainingSwiss(state);
    }

    case 'SKIP_TO_KNOCKOUT': {
      const isSwiss = ['swiss_pairings', 'swiss_results', 'swiss_complete'].includes(state.phase);
      if (!isSwiss && state.phase !== 'standings') return state;
      const afterSwiss = isSwiss ? runRemainingSwiss(state) : state;
      const { bracket, simBracket, simKnockoutRoundIndex, firstPhase } =
        generateBracketForConfig(afterSwiss.config, afterSwiss.standings);
      return { ...afterSwiss, phase: firstPhase, bracket, simBracket, simKnockoutRoundIndex, autoPlay: false };
    }

    case 'TOGGLE_AUTOPLAY':
      return { ...state, autoPlay: !state.autoPlay };

    case 'SET_SPEED':
      return { ...state, speed: action.speed };

    case 'OVERRIDE_MATCH': {
      const key = pKey(action.result.team1Id, action.result.team2Id);
      const newOverrides = new Map(state.matchOverrides);
      newOverrides.set(key, action.result);
      return { ...state, matchOverrides: newOverrides, editingMatch: null };
    }

    case 'CLEAR_OVERRIDE':
      return { ...state, editingMatch: null };

    case 'SET_EDITING_MATCH':
      return { ...state, editingMatch: action.match };

    case 'RESET':
      return { ...makeInitialState(), speed: state.speed, config: state.config };

    default:
      return state;
  }
}

/* ─── Speed config ────────────────────────────────────────────── */

const SPEED_MS: Record<Speed, number> = {
  fast: 200,
  normal: 600,
  slow: 1200,
};

/* ─── Helpers ─────────────────────────────────────────────────── */

function simResultToMatch(r: MatchResult, round: number, idx: number): Match {
  return {
    id: `sim-${round}-${idx}`,
    round,
    team1_id: r.team1Id,
    team2_id: r.team2Id,
    winner_id: r.winnerId,
    loser_id: r.loserId,
    score_team1: r.scoreTeam1,
    score_team2: r.scoreTeam2,
    table_number: idx + 1,
    scheduled_time: null,
    reported_by: null,
    confirmed: true,
    confirmed_by: 'admin',
    created_at: new Date().toISOString(),
  };
}

/* ─── SimKnockoutView ─────────────────────────────────────────── */

function SimKnockoutView({
  simBracket,
  teamNameMap,
  results,
  champion,
}: {
  simBracket: SimBracket;
  teamNameMap: Map<string, string>;
  results: MatchResult[];
  champion: string | null;
}) {
  function getResult(slot: BracketSlot) {
    if (!slot.team1Id || !slot.team2Id) return null;
    return results.find(
      (r) =>
        (r.team1Id === slot.team1Id && r.team2Id === slot.team2Id) ||
        (r.team1Id === slot.team2Id && r.team2Id === slot.team1Id),
    ) ?? null;
  }

  return (
    <div className="space-y-4">
      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: `repeat(${simBracket.rounds.length}, 1fr)` }}
      >
        {simBracket.rounds.map((round, ri) => (
          <div key={ri} className="space-y-3">
            <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {simBracket.labels[ri]}
            </h4>
            <div className="space-y-2 flex flex-col justify-around h-full">
              {round.map((slot) => {
                const result = getResult(slot);
                return (
                  <div
                    key={`${ri}-${slot.matchIndex}`}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden"
                  >
                    <SlotTeamRow
                      teamId={slot.team1Id}
                      teamNameMap={teamNameMap}
                      result={result}
                    />
                    <div className="h-px bg-white/[0.06]" />
                    <SlotTeamRow
                      teamId={slot.team2Id}
                      teamNameMap={teamNameMap}
                      result={result}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {champion && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', bounce: 0.4 }}
          className="text-center py-4"
        >
          <span className="text-2xl font-bold text-emerald-400">
            {teamNameMap.get(champion) ?? champion}
          </span>
          <p className="text-sm text-zinc-500 mt-1">Mästare</p>
        </motion.div>
      )}
    </div>
  );
}

function SlotTeamRow({
  teamId,
  teamNameMap,
  result,
}: {
  teamId: string | null;
  teamNameMap: Map<string, string>;
  result: MatchResult | null;
}) {
  if (!teamId) {
    return (
      <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-700">
        <span>TBD</span>
      </div>
    );
  }
  const isWinner = result?.winnerId === teamId;
  const isLoser = result?.loserId === teamId;
  const score =
    result && teamId === result.team1Id
      ? result.scoreTeam1
      : result && teamId === result.team2Id
        ? result.scoreTeam2
        : null;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 text-xs transition-colors',
        isWinner && 'bg-emerald-500/10 text-emerald-400',
        isLoser && 'text-zinc-600',
        !result && 'text-zinc-300',
      )}
    >
      <span className="truncate">{teamNameMap.get(teamId) ?? teamId}</span>
      {score !== null && (
        <span className="tabular-nums font-medium ml-2">{score}</span>
      )}
    </div>
  );
}

/* ─── Map View Wrapper ────────────────────────────────────────── */

const KNOCKOUT_PHASES = new Set<SimPhase>([
  'knockout_r16',
  'knockout_r16_results',
  'knockout_qf',
  'knockout_qf_results',
  'knockout_sf',
  'knockout_sf_results',
  'knockout_final',
  'knockout_final_results',
]);

function MapView({ state }: { state: SimState }) {
  const mapRounds: [number, Match[]][] = state.roundHistory.map((rh) => [
    rh.round,
    rh.results.map((r, i) => simResultToMatch(r, rh.round, i)),
  ]);

  if (
    state.roundResults.length > 0 &&
    !state.roundHistory.some((rh) => rh.round === state.currentRound)
  ) {
    const revealed = state.roundResults.slice(0, state.revealedCount);
    mapRounds.push([
      state.currentRound,
      revealed.map((r, i) => simResultToMatch(r, state.currentRound, i)),
    ]);
  }

  let mapStatus = 'swiss';
  if (KNOCKOUT_PHASES.has(state.phase)) {
    mapStatus = 'knockout';
  } else if (state.phase === 'champion') {
    mapStatus = 'finished';
  }

  return (
    <TournamentMapView
      rounds={mapRounds}
      standings={state.standings}
      teamNameMap={state.teamNameMap}
      liveBracket={state.bracket}
      knockoutResults={state.knockoutResults}
      champion={state.champion}
      totalRounds={state.config.swissRounds}
      status={mapStatus}
    />
  );
}

/* ─── Config Panel ────────────────────────────────────────────── */

function ConfigPanel({
  config,
  onConfig,
  onStart,
}: {
  config: SimConfig;
  onConfig: (partial: Partial<SimConfig>) => void;
  onStart: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-5 max-w-lg">
      <h3 className="text-sm font-semibold text-zinc-300">Simuleringsinställningar</h3>

      {/* Team count */}
      <label className="block space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Antal lag</span>
          <span className="tabular-nums text-white font-medium">{config.teamCount}</span>
        </div>
        <input
          type="range"
          min={4}
          max={64}
          step={1}
          value={config.teamCount}
          onChange={(e) => onConfig({ teamCount: +e.target.value })}
          className="w-full accent-brand-500"
        />
      </label>

      {/* Swiss rounds */}
      <label className="block space-y-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Swiss-rundor</span>
          <span className="tabular-nums text-white font-medium">{config.swissRounds}</span>
        </div>
        <input
          type="range"
          min={1}
          max={9}
          step={1}
          value={config.swissRounds}
          onChange={(e) => onConfig({ swissRounds: +e.target.value })}
          className="w-full accent-brand-500"
        />
      </label>

      {/* Knockout size */}
      <div className="space-y-1.5">
        <span className="text-xs text-zinc-400">Slutspelsstorlek</span>
        <div className="flex gap-1.5">
          {([4, 8, 16] as const).map((size) => (
            <button
              key={size}
              onClick={() => onConfig({ knockoutSize: size })}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-medium transition-all border',
                config.knockoutSize === size
                  ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                  : 'bg-white/[0.04] text-zinc-500 border-white/[0.06] hover:text-zinc-300',
              )}
            >
              Topp {size}
            </button>
          ))}
        </div>
      </div>

      {/* Strength bias toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => onConfig({ strengthBias: !config.strengthBias })}
          className={cn(
            'relative w-9 h-5 rounded-full transition-colors',
            config.strengthBias ? 'bg-brand-500' : 'bg-zinc-700',
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
              config.strengthBias && 'translate-x-4',
            )}
          />
        </div>
        <span className="text-xs text-zinc-400">
          Styrkebias
          <span className="text-zinc-600 ml-1">— lag med högre seed vinner oftare</span>
        </span>
      </label>

      {/* Validation warning */}
      {config.knockoutSize > config.teamCount && (
        <p className="text-xs text-amber-400">
          Slutspelsstorlek ({config.knockoutSize}) överskrider antal lag ({config.teamCount})
        </p>
      )}

      <button
        onClick={onStart}
        disabled={config.knockoutSize > config.teamCount}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
          'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
          'hover:brightness-110 active:scale-[0.98]',
          'disabled:opacity-40 disabled:pointer-events-none',
        )}
      >
        Starta simulering
      </button>
    </div>
  );
}

/* ─── Match Override Editor ────────────────────────────────────── */

function MatchOverrideEditor({
  match,
  teamNameMap,
  overrides,
  onOverride,
  onCancel,
}: {
  match: { team1Id: string; team2Id: string };
  teamNameMap: Map<string, string>;
  overrides: Map<string, MatchResult>;
  onOverride: (result: MatchResult) => void;
  onCancel: () => void;
}) {
  const key = pKey(match.team1Id, match.team2Id);
  const existing = overrides.get(key);
  const [score1, setScore1] = useState(existing?.scoreTeam1 ?? 6);
  const [score2, setScore2] = useState(existing?.scoreTeam2 ?? 0);

  const winnerId = score1 > score2 ? match.team1Id : score2 > score1 ? match.team2Id : match.team1Id;
  const loserId = winnerId === match.team1Id ? match.team2Id : match.team1Id;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3"
    >
      <p className="text-xs text-amber-400 font-medium">Manuellt resultat</p>
      <div className="flex items-center gap-4">
        <div className="flex-1 text-right">
          <span className="text-sm text-zinc-300">
            {teamNameMap.get(match.team1Id) ?? match.team1Id}
          </span>
        </div>
        <input
          type="number"
          min={0}
          max={6}
          value={score1}
          onChange={(e) => setScore1(Math.max(0, Math.min(6, +e.target.value)))}
          className="w-12 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-center text-sm text-white"
        />
        <span className="text-zinc-600">–</span>
        <input
          type="number"
          min={0}
          max={6}
          value={score2}
          onChange={(e) => setScore2(Math.max(0, Math.min(6, +e.target.value)))}
          className="w-12 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-center text-sm text-white"
        />
        <div className="flex-1">
          <span className="text-sm text-zinc-300">
            {teamNameMap.get(match.team2Id) ?? match.team2Id}
          </span>
        </div>
      </div>
      {score1 === score2 && (
        <p className="text-xs text-zinc-500">Lika: {teamNameMap.get(match.team1Id)} vinner vid lika poäng</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() =>
            onOverride({
              team1Id: match.team1Id,
              team2Id: match.team2Id,
              winnerId,
              loserId,
              scoreTeam1: score1,
              scoreTeam2: score2,
            })
          }
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:brightness-110 transition"
        >
          Sätt
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 border border-white/[0.06] hover:text-zinc-300 transition"
        >
          Avbryt
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Verification Stats Panel ────────────────────────────────── */

function StatsPanel({ state }: { state: SimState }) {
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    if (state.roundHistory.length === 0) return null;
    return computeVerificationStats(
      state.teams,
      state.allResults,
      state.roundHistory,
      state.standings.length > 0
        ? state.standings
        : calculateRankings(state.teams, state.allResults),
    );
  }, [state.teams, state.allResults, state.roundHistory, state.standings]);

  if (!stats) return null;

  const maxBar = Math.max(...stats.winDistribution, 1);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white transition"
      >
        <span>Algoritmverifiering</span>
        <span className={cn('transition-transform text-zinc-500', open && 'rotate-180')}>
          ▾
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
              {/* Rematches */}
              <div className="flex items-center gap-2 text-xs">
                <span className={stats.rematches === 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {stats.rematches === 0 ? '✓' : '⚠'}
                </span>
                <span className="text-zinc-400">Rematches:</span>
                <span className="text-white">{stats.rematches} av {stats.totalMatches} matcher</span>
              </div>

              {/* Bye distribution */}
              <div className="flex items-center gap-2 text-xs">
                <span className={stats.maxByes <= 1 ? 'text-emerald-400' : 'text-red-400'}>
                  {stats.maxByes <= 1 ? '✓' : '⚠'}
                </span>
                <span className="text-zinc-400">Bye-fördelning:</span>
                <span className="text-white">Max {stats.maxByes} byes per lag</span>
              </div>

              {/* Win distribution */}
              <div className="space-y-1.5">
                <span className="text-xs text-zinc-400">Vinstfördelning</span>
                <div className="space-y-1">
                  {stats.winDistribution.map((count, wins) => (
                    <div key={wins} className="flex items-center gap-2 text-xs">
                      <span className="w-12 text-right text-zinc-500 tabular-nums">{wins}V</span>
                      <div className="flex-1 h-4 bg-white/[0.03] rounded overflow-hidden">
                        <div
                          className="h-full bg-brand-500/30 rounded transition-all"
                          style={{ width: `${(count / maxBar) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-zinc-500 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buchholz correlation */}
              <div className="flex items-center gap-2 text-xs">
                <span className={stats.buchholzCorrelation > 0.7 ? 'text-emerald-400' : stats.buchholzCorrelation > 0.4 ? 'text-amber-400' : 'text-red-400'}>
                  {stats.buchholzCorrelation > 0.7 ? '✓' : '⚠'}
                </span>
                <span className="text-zinc-400">Buchholz-korrelation:</span>
                <span className="text-white">{stats.buchholzCorrelation}</span>
              </div>

              {/* Score diff per round */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-zinc-400">Snittpoäng per runda:</span>
                <span className="text-zinc-300">
                  {stats.avgScoreDiffPerRound.join(', ')}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Batch Simulation Panel ──────────────────────────────────── */

function BatchPanel({ config }: { config: SimConfig }) {
  const [count, setCount] = useState(100);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResults | null>(null);
  const abortRef = useRef(false);

  const run = useCallback(async () => {
    abortRef.current = false;
    setRunning(true);
    setProgress(0);
    setResults(null);
    const res = await runBatchSimulation(
      config,
      count,
      (done) => setProgress(done),
      abortRef,
    );
    setResults(res);
    setRunning(false);
  }, [config, count]);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4 max-w-lg">
      <h3 className="text-sm font-semibold text-zinc-300">Batch-simulering</h3>
      <p className="text-xs text-zinc-500">Kör flera turneringar utan UI för aggregerad statistik.</p>

      <div className="flex items-center gap-3">
        <label className="text-xs text-zinc-400">Antal</label>
        <input
          type="number"
          min={10}
          max={1000}
          value={count}
          onChange={(e) => setCount(Math.max(10, Math.min(1000, +e.target.value)))}
          disabled={running}
          className="w-20 px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-sm text-white text-center"
        />
        {!running ? (
          <button
            onClick={run}
            className={cn(
              'px-4 py-1.5 rounded-lg text-xs font-medium transition-all',
              'bg-brand-500/15 text-brand-400 border border-brand-500/30',
              'hover:brightness-110',
            )}
          >
            Kör batch
          </button>
        ) : (
          <button
            onClick={abort}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/20 hover:brightness-110 transition"
          >
            Avbryt
          </button>
        )}
      </div>

      {running && (
        <div className="space-y-1">
          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-200"
              style={{ width: `${(progress / count) * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 tabular-nums">{progress} / {count}</p>
        </div>
      )}

      {results && (
        <div className="space-y-3 pt-2 border-t border-white/[0.04]">
          <p className="text-xs text-zinc-400">{results.simulationsRun} turneringar körda</p>

          {/* Champion distribution */}
          <div className="space-y-1.5">
            <span className="text-xs text-zinc-400">Mästare (seed → frekvens)</span>
            <div className="flex flex-wrap gap-1.5">
              {[...results.championDistribution.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([seed, c]) => (
                  <span
                    key={seed}
                    className="px-2 py-0.5 rounded bg-white/[0.04] text-xs text-zinc-300 tabular-nums"
                  >
                    #{seed}: {Math.round((c / results.simulationsRun) * 100)}%
                  </span>
                ))}
            </div>
          </div>

          {/* Top-N frequency for top seeds */}
          <div className="space-y-1.5">
            <span className="text-xs text-zinc-400">Topp-{config.knockoutSize} frekvens (seed 1–8)</span>
            <div className="flex flex-wrap gap-1.5">
              {results.topNFrequency.slice(0, 8).map((pct, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-white/[0.04] text-xs text-zinc-300 tabular-nums"
                >
                  #{i + 1}: {pct}%
                </span>
              ))}
            </div>
          </div>

          {/* Avg rank by seed */}
          <div className="space-y-1.5">
            <span className="text-xs text-zinc-400">Snittplacering (seed 1–8)</span>
            <div className="flex flex-wrap gap-1.5">
              {results.avgRankBySeed.slice(0, 8).map((avg, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-white/[0.04] text-xs text-zinc-300 tabular-nums"
                >
                  #{i + 1}: {avg}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Component ───────────────────────────────────────────────── */

export default function SimulatorTab() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [view, setView] = useState<'steps' | 'map'>('steps');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = useCallback(() => dispatch({ type: 'STEP' }), []);

  // Auto-play interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (
      state.autoPlay &&
      state.phase !== 'idle' &&
      state.phase !== 'champion'
    ) {
      intervalRef.current = setInterval(step, SPEED_MS[state.speed]);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.autoPlay, state.phase, state.speed, step]);

  // Phase label
  function getPhaseLabel(): string {
    switch (state.phase) {
      case 'idle':
        return 'Redo att starta';
      case 'swiss_pairings':
      case 'swiss_results':
      case 'swiss_complete':
        return `Swiss Runda ${state.currentRound} av ${state.config.swissRounds}`;
      case 'standings':
        return `Slutställning — Topp ${state.config.knockoutSize} till slutspel`;
      case 'knockout_r16':
      case 'knockout_r16_results':
        return 'Åttondelsfinaler';
      case 'knockout_qf':
      case 'knockout_qf_results':
        return 'Kvartsfinal';
      case 'knockout_sf':
      case 'knockout_sf_results':
        return 'Semifinal';
      case 'knockout_final':
      case 'knockout_final_results':
        return 'Final';
      case 'champion':
        return 'Turnering avslutad!';
    }
  }

  const canStep = state.phase !== 'idle' && state.phase !== 'champion';
  const isSwiss = ['swiss_pairings', 'swiss_results', 'swiss_complete'].includes(state.phase);
  // Determine which knockout phases to show for this config
  const knockoutPhases: SimPhase[] = [];
  if (state.config.knockoutSize === 16) {
    knockoutPhases.push('knockout_r16', 'knockout_r16_results');
  }
  if (state.config.knockoutSize >= 8) {
    knockoutPhases.push('knockout_qf', 'knockout_qf_results');
  }
  knockoutPhases.push(
    'knockout_sf', 'knockout_sf_results',
    'knockout_final', 'knockout_final_results',
    'champion',
  );

  const showKnockout = knockoutPhases.includes(state.phase);

  // Check for overridden matches in current round
  const hasOverridesInRound = useMemo(() => {
    if (!state.roundPairings) return new Set<string>();
    const keys = new Set<string>();
    for (const p of state.roundPairings.pairings) {
      const key = pKey(p.team1Id, p.team2Id);
      if (state.matchOverrides.has(key)) keys.add(key);
    }
    return keys;
  }, [state.roundPairings, state.matchOverrides]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {state.phase === 'idle' ? null : (
          <>
            <button
              onClick={step}
              disabled={!canStep || state.autoPlay}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
                'hover:brightness-110 active:scale-[0.98]',
                'disabled:opacity-40 disabled:pointer-events-none',
              )}
            >
              Steg ▶
            </button>

            <button
              onClick={() => dispatch({ type: 'TOGGLE_AUTOPLAY' })}
              disabled={!canStep}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                state.autoPlay
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                  : 'bg-white/[0.04] text-zinc-400 border-white/[0.08] hover:text-white',
                'disabled:opacity-40 disabled:pointer-events-none',
              )}
            >
              {state.autoPlay ? 'Pausa ⏸' : 'Auto ▶▶'}
            </button>

            {/* Skip controls */}
            {isSwiss && (
              <>
                <button
                  onClick={() => dispatch({ type: 'SKIP_TO_STANDINGS' })}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 border border-white/[0.06] hover:text-white transition"
                >
                  ⏭ Ställning
                </button>
                <button
                  onClick={() => dispatch({ type: 'SKIP_TO_KNOCKOUT' })}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 border border-white/[0.06] hover:text-white transition"
                >
                  ⏭ Slutspel
                </button>
              </>
            )}
            {state.phase === 'standings' && (
              <button
                onClick={() => dispatch({ type: 'SKIP_TO_KNOCKOUT' })}
                className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 border border-white/[0.06] hover:text-white transition"
              >
                ⏭ Slutspel
              </button>
            )}
          </>
        )}

        {state.phase !== 'idle' && (
          <>
            {/* View toggle */}
            <div className="flex items-center gap-1.5 ml-auto">
              {(['steps', 'map'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs transition-all border',
                    view === v
                      ? 'bg-white/[0.08] text-white border-white/[0.12]'
                      : 'text-zinc-600 border-transparent hover:text-zinc-400',
                  )}
                >
                  {v === 'steps' ? 'Steg' : 'Karta'}
                </button>
              ))}
            </div>

            {/* Speed */}
            <div className="flex items-center gap-1.5">
              {(['fast', 'normal', 'slow'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => dispatch({ type: 'SET_SPEED', speed: s })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs transition-all border',
                    state.speed === s
                      ? 'bg-white/[0.08] text-white border-white/[0.12]'
                      : 'text-zinc-600 border-transparent hover:text-zinc-400',
                  )}
                >
                  {s === 'fast' ? 'Snabb' : s === 'normal' ? 'Normal' : 'Långsam'}
                </button>
              ))}
            </div>

            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="px-3 py-2 rounded-xl text-sm text-zinc-500 border border-white/[0.06] hover:text-white transition"
            >
              Nollställ ↺
            </button>
          </>
        )}
      </div>

      {/* Phase badge */}
      {state.phase !== 'idle' && (
        <motion.div
          key={getPhaseLabel()}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-white/[0.04] border border-white/[0.06] text-zinc-300"
        >
          {getPhaseLabel()}
        </motion.div>
      )}

      {/* Step-by-step view */}
      {view === 'steps' && (
        <>
          {/* Swiss round display */}
          {(state.phase === 'swiss_pairings' ||
            state.phase === 'swiss_results' ||
            state.phase === 'swiss_complete') &&
            state.roundPairings && (
              <>
                <SwissRoundCard
                  round={state.currentRound}
                  pairings={state.roundPairings.pairings}
                  results={state.roundResults}
                  teamNameMap={state.teamNameMap}
                  bye={state.roundPairings.bye}
                  revealedCount={state.revealedCount}
                  animated
                  onMatchClick={
                    state.phase === 'swiss_pairings'
                      ? (t1, t2) => dispatch({ type: 'SET_EDITING_MATCH', match: { team1Id: t1, team2Id: t2 } })
                      : undefined
                  }
                />
                {/* Match override editor */}
                <AnimatePresence>
                  {state.editingMatch && state.phase === 'swiss_pairings' && (
                    <MatchOverrideEditor
                      match={state.editingMatch}
                      teamNameMap={state.teamNameMap}
                      overrides={state.matchOverrides}
                      onOverride={(result) => dispatch({ type: 'OVERRIDE_MATCH', result })}
                      onCancel={() => dispatch({ type: 'CLEAR_OVERRIDE' })}
                    />
                  )}
                </AnimatePresence>
                {/* Show override count */}
                {hasOverridesInRound.size > 0 && (
                  <p className="text-xs text-amber-400">
                    ✏ {hasOverridesInRound.size} manuella resultat inställda
                  </p>
                )}
              </>
            )}

          {/* Standings */}
          {(state.phase === 'standings' || state.phase === 'champion') &&
            state.standings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-400">Slutställning</h3>
                <StandingsTable
                  standings={state.standings}
                  highlightTop={state.config.knockoutSize}
                  compact
                />
              </div>
            )}

          {/* Knockout bracket */}
          {showKnockout && state.bracket && state.config.knockoutSize === 8 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-400">Slutspel</h3>
              <KnockoutBracketView
                bracket={state.bracket}
                teamNameMap={state.teamNameMap}
                results={state.knockoutResults}
                champion={state.champion}
                animated
              />
            </div>
          )}

          {/* SimBracket for top-4 / top-16 */}
          {showKnockout && state.simBracket && state.config.knockoutSize !== 8 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-400">Slutspel</h3>
              <SimKnockoutView
                simBracket={state.simBracket}
                teamNameMap={state.teamNameMap}
                results={state.knockoutResults}
                champion={state.champion}
              />
            </div>
          )}
        </>
      )}

      {/* Map view */}
      {view === 'map' && state.phase !== 'idle' && (
        <MapView state={state} />
      )}

      {/* Verification stats panel (shown when we have round history) */}
      {state.phase !== 'idle' && state.roundHistory.length > 0 && (
        <StatsPanel state={state} />
      )}

      {/* Idle state: config panel + batch */}
      {state.phase === 'idle' && (
        <div className="space-y-6">
          <ConfigPanel
            config={state.config}
            onConfig={(partial) => dispatch({ type: 'SET_CONFIG', config: partial })}
            onStart={() => dispatch({ type: 'GENERATE_TEAMS' })}
          />
          <BatchPanel config={state.config} />
        </div>
      )}
    </div>
  );
}
