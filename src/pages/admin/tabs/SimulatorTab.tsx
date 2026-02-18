import { useReducer, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { generateFakeTeams, simulateMatchResult } from '@/lib/simulator';
import {
  generateSwissPairings,
  generateKnockoutBracket,
  advanceKnockoutRound,
  calculateRankings,
  type TournamentTeam,
  type MatchResult,
  type RoundPairings,
  type KnockoutBracket as KnockoutBracketType,
  type TeamStanding,
} from '@/lib/tournament-engine';
import StandingsTable from '../components/StandingsTable';
import SwissRoundCard from '../components/SwissRoundCard';
import KnockoutBracketView from '../components/KnockoutBracketView';

/* ─── State Machine ───────────────────────────────────────────── */

type SimPhase =
  | 'idle'
  | 'swiss_pairings'
  | 'swiss_results'
  | 'swiss_complete'
  | 'standings'
  | 'knockout_qf'
  | 'knockout_qf_results'
  | 'knockout_sf'
  | 'knockout_sf_results'
  | 'knockout_final'
  | 'knockout_final_results'
  | 'champion';

type Speed = 'fast' | 'normal' | 'slow';

interface SimState {
  phase: SimPhase;
  teams: TournamentTeam[];
  teamNameMap: Map<string, string>;
  currentRound: number;
  allResults: MatchResult[];
  roundPairings: RoundPairings | null;
  roundResults: MatchResult[];
  revealedCount: number;
  standings: TeamStanding[];
  bracket: KnockoutBracketType | null;
  knockoutResults: MatchResult[];
  champion: string | null;
  autoPlay: boolean;
  speed: Speed;
}

type SimAction =
  | { type: 'GENERATE_TEAMS' }
  | { type: 'STEP' }
  | { type: 'TOGGLE_AUTOPLAY' }
  | { type: 'SET_SPEED'; speed: Speed }
  | { type: 'RESET' };

const INITIAL_STATE: SimState = {
  phase: 'idle',
  teams: [],
  teamNameMap: new Map(),
  currentRound: 0,
  allResults: [],
  roundPairings: null,
  roundResults: [],
  revealedCount: 0,
  standings: [],
  bracket: null,
  knockoutResults: [],
  champion: null,
  autoPlay: false,
  speed: 'normal',
};

function reducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case 'GENERATE_TEAMS': {
      const teams = generateFakeTeams(32);
      const nameMap = new Map(teams.map((t) => [t.id, t.name]));
      const pairings = generateSwissPairings(teams, [], 1);
      return {
        ...INITIAL_STATE,
        phase: 'swiss_pairings',
        teams,
        teamNameMap: nameMap,
        currentRound: 1,
        roundPairings: pairings,
        speed: state.speed,
        autoPlay: state.autoPlay,
      };
    }

    case 'STEP': {
      switch (state.phase) {
        case 'swiss_pairings': {
          // Generate all round results, start revealing
          const results = state.roundPairings!.pairings.map(simulateMatchResult);
          return {
            ...state,
            phase: 'swiss_results',
            roundResults: results,
            revealedCount: 1,
          };
        }

        case 'swiss_results': {
          if (state.revealedCount < state.roundResults.length) {
            return { ...state, revealedCount: state.revealedCount + 1 };
          }
          // All revealed — complete the round
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
          if (state.currentRound < 7) {
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
            };
          }
          // After round 7: show standings
          const standings = calculateRankings(state.teams, state.allResults);
          return { ...state, phase: 'standings', standings };
        }

        case 'standings': {
          const top8 = state.standings.slice(0, 8).map((s) => ({
            id: s.id,
            name: s.name,
            wins: s.wins,
            losses: s.losses,
          }));
          const bracket = generateKnockoutBracket(top8);
          return { ...state, phase: 'knockout_qf', bracket };
        }

        case 'knockout_qf': {
          const results = state.bracket!.quarterfinals.map((qf) =>
            simulateMatchResult({ team1Id: qf.team1Id!, team2Id: qf.team2Id! }),
          );
          const bracket = advanceKnockoutRound(
            state.bracket!,
            results,
            'quarterfinals',
          );
          return {
            ...state,
            phase: 'knockout_qf_results',
            bracket,
            knockoutResults: [...state.knockoutResults, ...results],
          };
        }

        case 'knockout_qf_results': {
          return { ...state, phase: 'knockout_sf' };
        }

        case 'knockout_sf': {
          const results = state.bracket!.semifinals.map((sf) =>
            simulateMatchResult({ team1Id: sf.team1Id!, team2Id: sf.team2Id! }),
          );
          const bracket = advanceKnockoutRound(
            state.bracket!,
            results,
            'semifinals',
          );
          return {
            ...state,
            phase: 'knockout_sf_results',
            bracket,
            knockoutResults: [...state.knockoutResults, ...results],
          };
        }

        case 'knockout_sf_results': {
          return { ...state, phase: 'knockout_final' };
        }

        case 'knockout_final': {
          const f = state.bracket!.final;
          const result = simulateMatchResult({
            team1Id: f.team1Id!,
            team2Id: f.team2Id!,
          });
          return {
            ...state,
            phase: 'knockout_final_results',
            knockoutResults: [...state.knockoutResults, result],
          };
        }

        case 'knockout_final_results': {
          const lastResult =
            state.knockoutResults[state.knockoutResults.length - 1];
          return { ...state, phase: 'champion', champion: lastResult.winnerId };
        }

        default:
          return state;
      }
    }

    case 'TOGGLE_AUTOPLAY':
      return { ...state, autoPlay: !state.autoPlay };

    case 'SET_SPEED':
      return { ...state, speed: action.speed };

    case 'RESET':
      return { ...INITIAL_STATE, speed: state.speed };

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

/* ─── Component ───────────────────────────────────────────────── */

export default function SimulatorTab() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
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
        return `Swiss Runda ${state.currentRound} av 7`;
      case 'standings':
        return 'Slutställning — Topp 8 till slutspel';
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

  const canStep =
    state.phase !== 'idle' && state.phase !== 'champion';

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {state.phase === 'idle' ? (
          <button
            onClick={() => dispatch({ type: 'GENERATE_TEAMS' })}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
              'hover:brightness-110 active:scale-[0.98]',
            )}
          >
            Generera 32 lag
          </button>
        ) : (
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
          </>
        )}

        {state.phase !== 'idle' && (
          <>
            {/* Speed */}
            <div className="flex items-center gap-1.5 ml-auto">
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

      {/* Swiss round display */}
      {(state.phase === 'swiss_pairings' ||
        state.phase === 'swiss_results' ||
        state.phase === 'swiss_complete') &&
        state.roundPairings && (
          <SwissRoundCard
            round={state.currentRound}
            pairings={state.roundPairings.pairings}
            results={state.roundResults}
            teamNameMap={state.teamNameMap}
            bye={state.roundPairings.bye}
            revealedCount={state.revealedCount}
            animated
          />
        )}

      {/* Standings */}
      {(state.phase === 'standings' || state.phase === 'champion') &&
        state.standings.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400">Slutställning</h3>
            <StandingsTable standings={state.standings} highlightTop={8} compact />
          </div>
        )}

      {/* Knockout bracket */}
      {state.bracket &&
        [
          'knockout_qf',
          'knockout_qf_results',
          'knockout_sf',
          'knockout_sf_results',
          'knockout_final',
          'knockout_final_results',
          'champion',
        ].includes(state.phase) && (
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

      {/* Idle state */}
      {state.phase === 'idle' && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-lg">Klicka "Generera 32 lag" för att börja</p>
          <p className="text-sm mt-2">
            Simulerar en komplett turnering med Swiss-system och slutspel
          </p>
        </div>
      )}
    </div>
  );
}
