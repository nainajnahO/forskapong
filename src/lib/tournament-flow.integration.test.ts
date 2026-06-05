/**
 * Rigorous end-to-end invariant harness for the tournament FLOW.
 *
 * This is a throwaway QA harness (not part of the normal suite's intent) that
 * drives a full tournament — Swiss rounds → cutoff-tie resolution → knockout →
 * champion — by calling the SAME engine functions, in the SAME order, with the
 * SAME arguments as the admin `TournamentTab` handlers (`handleGeneratePairings`,
 * `handleGenerateNextKnockoutRound`, `handleStartTournament`). The orchestration
 * glue lives in React handlers that aren't importable, so this file REPLICATES
 * that glue; the engine math itself is the real, production code.
 *
 * Determinism: `Math.random` is replaced per iteration with a seeded mulberry32,
 * so every assertion failure prints a config + seed that re-runs identically.
 */
import { describe, it, afterEach } from 'vitest';
import type { Match, Team } from '@/lib/database.types';
import {
  generateSwissPairings,
  generateKnockoutBracket,
  advanceKnockoutRound,
  deriveByes,
  countByesPerTeam,
  knockoutLabels,
  isPowerOfTwo,
  detectUnresolvedCutoffTie,
  applyCutoffTieOrder,
  type MatchResult,
  type TournamentTeam,
  type TeamStanding,
} from '@/lib/tournament-engine';
import { orientSwissPairings } from '@/lib/home-away';
import { assignTablesAndWaves, getWaveCount, waveStartTime } from '@/lib/table-scheduling';
import {
  buildLiveBracket,
  nextKnockoutRoundIndex,
  seedFirstKnockoutRound,
  pairKnockoutWinners,
} from '@/lib/live-knockout';
import { dbMatchToResult, teamsToEngine, byesByRound, standingsFromMatches } from '@/pages/admin/lib/match-utils';

/* ─── Seeded RNG (reproducible failures) ──────────────────────── */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const realRandom = Math.random;
afterEach(() => {
  Math.random = realRandom;
});

/* ─── DB-shaped fixtures ──────────────────────────────────────── */

function makeTeams(n: number): Team[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${String(i + 1).padStart(3, '0')}`,
    name: `Lag ${i + 1}`,
    wins: 0,
    losses: 0,
    checked_in: true,
    created_at: '2026-01-01T00:00:00Z',
    player1: null,
    player2: null,
  }));
}

let matchSeq = 0;
function makeMatch(row: Partial<Match> & Pick<Match, 'round' | 'team1_id' | 'team2_id'>): Match {
  return {
    id: `m${++matchSeq}`,
    created_at: '2026-01-01T00:00:00Z',
    wave: 1,
    table_number: null,
    scheduled_time: null,
    winner_id: null,
    loser_id: null,
    score_team1: null,
    score_team2: null,
    confirmed: false,
    confirmed_by: null,
    reported_by: null,
    ...row,
  };
}

/** Simulate a reported+confirmed result for a generated (home=team1, away=team2) row. */
function playMatch(home: string, away: string, winnerScore = 6): { winner_id: string; loser_id: string; score_team1: number; score_team2: number } {
  const homeWins = Math.random() < 0.5;
  const loserScore = Math.floor(Math.random() * winnerScore); // 0..winnerScore-1
  const winner = homeWins ? home : away;
  const loser = homeWins ? away : home;
  return {
    winner_id: winner,
    loser_id: loser,
    score_team1: winner === home ? winnerScore : loserScore,
    score_team2: winner === away ? winnerScore : loserScore,
  };
}

/* ─── Assertion helper that dumps reproduction context ────────── */

class InvariantError extends Error {}
function check(cond: boolean, msg: string, ctx: Record<string, unknown> = {}): asserts cond {
  if (!cond) {
    throw new InvariantError(`${msg}\nCONTEXT: ${JSON.stringify(ctx, null, 2)}`);
  }
}

/* ─── Config space ────────────────────────────────────────────── */

interface Config {
  teams: number;
  rounds: number;
  knockout: number;
  tables: number;
  seeds: number;
  label: string;
}

const CONFIGS: Config[] = [
  { teams: 54, rounds: 7, knockout: 8, tables: 16, seeds: 50, label: 'real-event 54/7/8' },
  { teams: 32, rounds: 7, knockout: 8, tables: 16, seeds: 50, label: 'classic 32/7/8' },
  { teams: 53, rounds: 7, knockout: 8, tables: 16, seeds: 50, label: 'odd 53/7/8 (byes)' },
  { teams: 16, rounds: 5, knockout: 8, tables: 4, seeds: 40, label: '16/5/8' },
  { teams: 16, rounds: 4, knockout: 16, tables: 8, seeds: 40, label: 'whole-field KO 16/4/16' },
  { teams: 8, rounds: 4, knockout: 4, tables: 2, seeds: 40, label: 'small 8/4/4' },
  { teams: 7, rounds: 3, knockout: 4, tables: 2, seeds: 40, label: 'odd small 7/3/4' },
  { teams: 5, rounds: 3, knockout: 4, tables: 2, seeds: 40, label: 'tiny odd 5/3/4' },
  { teams: 4, rounds: 2, knockout: 4, tables: 16, seeds: 40, label: 'minimal 4/2/4' },
];

/* ─── Full-flow simulation (mirrors TournamentTab handlers) ───── */

interface FlowOutcome {
  matches: Match[];
  standings: TeamStanding[];
  playoffSize: number;
  knockoutStartRound: number;
  champion: string | null;
  tieResolved: boolean;
  maxHomeAwayImbalance: number;
}

function runFlow(cfg: Config, seed: number): FlowOutcome {
  const teams = makeTeams(cfg.teams);
  const teamIds = teams.map((t) => t.id);

  // handleStartTournament clamps (replicated verbatim).
  const maxKnockout = teams.length >= 2 ? 2 ** Math.floor(Math.log2(teams.length)) : 2;
  const playoffSize = Math.min(cfg.knockout, maxKnockout);
  const totalRounds = Math.min(cfg.rounds, Math.max(1, teams.length - 1));
  const knockoutStartRound = totalRounds + 1;
  const tableCount = cfg.tables;
  const duration = 10;
  const roundStart = '17:00';

  check(isPowerOfTwo(playoffSize), 'clamped knockout size must be power of 2', { cfg, playoffSize });

  const matches: Match[] = [];

  /* ── Swiss phase ── */
  for (let round = 1; round <= totalRounds; round++) {
    const completedResults = matches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
    const priorByes = countByesPerTeam(byesByRound(teams, matches));
    const engineTeams = teamsToEngine(teams, completedResults, priorByes);

    const rp = generateSwissPairings(engineTeams, completedResults, round);

    // ── per-round structural invariants ──
    const activeCount = teams.length % 2 === 0 ? teams.length : teams.length - 1;
    check(
      rp.pairings.length === activeCount / 2,
      `round ${round}: expected ${activeCount / 2} pairings, got ${rp.pairings.length}`,
      { cfg, seed, round, bye: rp.bye },
    );
    check((teams.length % 2 === 0) === (rp.bye === null), `round ${round}: bye presence must match field parity`, { cfg, seed, round, bye: rp.bye });

    // Every active team appears exactly once; bye team zero times.
    const seen = new Map<string, number>();
    for (const p of rp.pairings) {
      seen.set(p.team1Id, (seen.get(p.team1Id) ?? 0) + 1);
      seen.set(p.team2Id, (seen.get(p.team2Id) ?? 0) + 1);
    }
    for (const id of teamIds) {
      const appearances = seen.get(id) ?? 0;
      const expected = id === rp.bye ? 0 : 1;
      check(appearances === expected, `round ${round}: team ${id} appears ${appearances}x, expected ${expected}`, { cfg, seed, round, bye: rp.bye });
    }

    // No rematch (rounds are always <= teams-1 here, so a no-rematch matching exists).
    const playedBefore = new Set<string>();
    for (const r of completedResults) playedBefore.add([r.team1Id, r.team2Id].sort().join('-'));
    for (const p of rp.pairings) {
      const key = [p.team1Id, p.team2Id].sort().join('-');
      check(!playedBefore.has(key), `round ${round}: REMATCH ${key}`, { cfg, seed, round });
    }

    // Bye goes to a lowest-wins team that has not had a prior bye.
    if (rp.bye !== null) {
      const priorByeIds = new Set([...priorByes.keys()].filter((id) => (priorByes.get(id) ?? 0) > 0));
      const eligible = engineTeams.filter((t) => !priorByeIds.has(t.id));
      if (eligible.length > 0) {
        check(!priorByeIds.has(rp.bye), `round ${round}: bye ${rp.bye} already had a bye while others hadn't`, { cfg, seed, round });
        const minWins = Math.min(...eligible.map((t) => t.wins));
        const byeWins = engineTeams.find((t) => t.id === rp.bye)!.wins;
        check(byeWins === minWins, `round ${round}: bye went to wins=${byeWins}, min eligible=${minWins}`, { cfg, seed, round });
      }
    }

    // ── orient + schedule (mirrors handleGeneratePairings) ──
    const swissHistory = matches.filter((m) => m.round <= totalRounds);
    const oriented = orientSwissPairings(rp.pairings, swissHistory);
    const scheduled = assignTablesAndWaves(oriented, tableCount);

    // Wave/table invariants for this round.
    const waveCount = getWaveCount(scheduled.length, tableCount);
    const byWave = new Map<number, Array<{ tableNumber: number; homeTeamId: string; awayTeamId: string }>>();
    for (const s of scheduled) {
      check(s.wave >= 1 && s.wave <= waveCount, `round ${round}: wave ${s.wave} out of 1..${waveCount}`, { cfg, seed, round });
      check(s.tableNumber >= 1 && s.tableNumber <= tableCount, `round ${round}: table ${s.tableNumber} out of 1..${tableCount}`, { cfg, seed, round });
      const arr = byWave.get(s.wave) ?? [];
      arr.push(s);
      byWave.set(s.wave, arr);
    }
    for (const [wave, arr] of byWave) {
      check(arr.length <= tableCount, `round ${round} wave ${wave}: ${arr.length} matches > ${tableCount} tables`, { cfg, seed, round });
      const tablesUsed = new Set(arr.map((a) => a.tableNumber));
      check(tablesUsed.size === arr.length, `round ${round} wave ${wave}: table double-booked`, { cfg, seed, round });
      // No team plays twice in the same wave.
      const teamsInWave = new Set<string>();
      for (const a of arr) {
        check(!teamsInWave.has(a.homeTeamId) && !teamsInWave.has(a.awayTeamId), `round ${round} wave ${wave}: a team is double-booked in one wave`, { cfg, seed, round });
        teamsInWave.add(a.homeTeamId);
        teamsInWave.add(a.awayTeamId);
      }
    }
    // All waves except the last are full (sequential fill).
    for (let w = 1; w < waveCount; w++) {
      check((byWave.get(w)?.length ?? 0) === tableCount, `round ${round}: non-final wave ${w} not full`, { cfg, seed, round });
    }

    // Persist rows (home=team1, away=team2) with simulated, confirmed results.
    for (const s of scheduled) {
      const res = playMatch(s.homeTeamId, s.awayTeamId);
      matches.push(
        makeMatch({
          round,
          wave: s.wave,
          team1_id: s.homeTeamId,
          team2_id: s.awayTeamId,
          table_number: s.tableNumber,
          scheduled_time: waveStartTime(roundStart, s.wave, duration),
          ...res,
          confirmed: true,
          confirmed_by: 'away',
          reported_by: s.homeTeamId,
        }),
      );
      // scheduled_time arithmetic itself is covered by table-scheduling.test.ts; the
      // row above just stores waveStartTime()'s output, so we don't re-assert it here.
    }
  }

  /* ── Swiss-wide invariants ── */
  const swissMatches = matches.filter((m) => m.round <= totalRounds);
  const byeRounds = deriveByes(teamIds, swissMatches.map((m) => ({ round: m.round, team1Id: m.team1_id, team2Id: m.team2_id })));
  const byeCounts = countByesPerTeam(byeRounds);

  // deriveByes: exactly one bye per round iff odd field.
  for (let round = 1; round <= totalRounds; round++) {
    const has = byeRounds.has(round);
    check(has === (teams.length % 2 !== 0), `deriveByes round ${round}: bye=${has} but parity says otherwise`, { cfg, seed });
  }
  // Each team plays totalRounds - byes; ≤1 bye each (rounds < teams).
  const playCount = new Map<string, number>();
  for (const m of swissMatches) {
    playCount.set(m.team1_id, (playCount.get(m.team1_id) ?? 0) + 1);
    playCount.set(m.team2_id, (playCount.get(m.team2_id) ?? 0) + 1);
  }
  for (const id of teamIds) {
    const byes = byeCounts.get(id) ?? 0;
    check(byes <= 1, `team ${id} got ${byes} byes (should be ≤1)`, { cfg, seed });
    check((playCount.get(id) ?? 0) === totalRounds - byes, `team ${id}: played ${playCount.get(id) ?? 0}, expected ${totalRounds - byes}`, { cfg, seed });
  }
  // Home/away balance: orientSwissPairings is a greedy per-round heuristic with NO
  // global ≤1 guarantee, so we MEASURE the worst imbalance rather than asserting a
  // tight bound. Sanity: imbalance can never exceed games played (guards a sign bug).
  const homeC = new Map<string, number>();
  const awayC = new Map<string, number>();
  for (const m of swissMatches) {
    homeC.set(m.team1_id, (homeC.get(m.team1_id) ?? 0) + 1);
    awayC.set(m.team2_id, (awayC.get(m.team2_id) ?? 0) + 1);
  }
  let maxHomeAwayImbalance = 0;
  for (const id of teamIds) {
    const home = homeC.get(id) ?? 0;
    const away = awayC.get(id) ?? 0;
    const imbalance = Math.abs(home - away);
    check(imbalance <= home + away, `team ${id}: imbalance ${imbalance} exceeds games played`, { cfg, seed });
    if (imbalance > maxHomeAwayImbalance) maxHomeAwayImbalance = imbalance;
  }

  /* ── Standings (real app path) ── */
  const standings = standingsFromMatches(teams, matches);
  assertStandingsValid(standings, matches, byeCounts, cfg, seed);

  /* ── Knockout phase (mirrors handleGenerateNextKnockoutRound) ── */
  // Cutoff-tie resolution (mirrors the admin resolver): if a tie straddles the
  // cutoff, record the current standings order of the group as the resolution.
  const completedForTie = matches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
  const tie = detectUnresolvedCutoffTie(standings, completedForTie, playoffSize);
  let playoffStandings = standings;
  let tieResolved = false;
  if (tie) {
    const order = standings.filter((s) => tie.teamIds.includes(s.id)).map((s) => s.id);
    playoffStandings = applyCutoffTieOrder(standings, order);
    tieResolved = true;
    // (applyCutoffTieOrder's renumbering/contiguity is verified directly in its own
    // describe block below; re-detecting here added no real signal, so it's omitted.)
  }

  const numKO = Math.log2(playoffSize);
  const baseRankMap = new Map(standings.map((s) => [s.id, s.rank]));
  const playoffRankMap = new Map(playoffStandings.map((s) => [s.id, s.rank]));

  for (let roundIdx = 0; roundIdx < numKO; roundIdx++) {
    const targetRound = knockoutStartRound + roundIdx;
    let oriented;
    if (roundIdx === 0) {
      const seeds: TournamentTeam[] = playoffStandings.slice(0, playoffSize).map((s) => ({ id: s.id, name: s.name, wins: s.wins, losses: s.losses }));
      check(seeds.length === playoffSize, `need ${playoffSize} seeds, got ${seeds.length}`, { cfg, seed });
      oriented = seedFirstKnockoutRound(seeds, matches, knockoutStartRound, playoffRankMap);

      // First-round orientation: home is the better-seeded (lower rank) team.
      for (const o of oriented) {
        const rh = playoffRankMap.get(o.homeTeamId) ?? Infinity;
        const ra = playoffRankMap.get(o.awayTeamId) ?? Infinity;
        check(rh <= ra, `KO R1: home ${o.homeTeamId}(rank ${rh}) should outrank away ${o.awayTeamId}(rank ${ra})`, { cfg, seed });
      }
    } else {
      const prevConfirmed = matches.filter((m) => m.round === targetRound - 1 && m.confirmed);
      check(prevConfirmed.length === playoffSize >> roundIdx, `KO round ${targetRound}: prev has ${prevConfirmed.length}, expected ${playoffSize >> roundIdx}`, { cfg, seed });
      oriented = pairKnockoutWinners(prevConfirmed, targetRound, knockoutStartRound, matches, baseRankMap);
    }

    const scheduled = assignTablesAndWaves(oriented, tableCount);
    check(scheduled.length === playoffSize >> (roundIdx + 1), `KO round ${targetRound}: ${scheduled.length} matches, expected ${playoffSize >> (roundIdx + 1)}`, { cfg, seed });

    for (const s of scheduled) {
      const res = playMatch(s.homeTeamId, s.awayTeamId);
      matches.push(
        makeMatch({
          round: targetRound,
          wave: s.wave,
          team1_id: s.homeTeamId,
          team2_id: s.awayTeamId,
          table_number: s.tableNumber,
          ...res,
          confirmed: true,
          confirmed_by: 'admin',
          reported_by: s.homeTeamId,
        }),
      );
    }
  }

  /* ── buildLiveBracket round-trip ── */
  const koMatches = matches.filter((m) => m.round >= knockoutStartRound);
  const live = buildLiveBracket(koMatches, knockoutStartRound, playoffSize);
  check(live !== null, 'live bracket should build', { cfg, seed });
  check(live!.rounds.length === numKO, `bracket has ${live!.rounds.length} rounds, expected ${numKO}`, { cfg, seed });
  check(live!.labels.length === numKO && live!.labels.join() === knockoutLabels(playoffSize).join(), 'bracket labels', { cfg, seed });
  // First round reconstructs the inserted (wave,table) order exactly.
  const firstRoundRows = koMatches
    .filter((m) => m.round === knockoutStartRound)
    .sort((a, b) => a.wave - b.wave || (a.table_number ?? 0) - (b.table_number ?? 0));
  live!.rounds[0].forEach((slot, i) => {
    check(slot.team1Id === firstRoundRows[i].team1_id && slot.team2Id === firstRoundRows[i].team2_id, `bracket R1 slot ${i} mismatch`, { cfg, seed });
  });

  // nextKnockoutRoundIndex reports completion.
  check(nextKnockoutRoundIndex(matches, knockoutStartRound) === numKO, 'bracket should read as complete', { cfg, seed });

  const lastRound = knockoutStartRound + numKO - 1;
  const finalRow = koMatches.find((m) => m.round === lastRound);
  check(!!finalRow?.winner_id, 'final must have a winner', { cfg, seed });
  const champion = finalRow!.winner_id;
  const playoffIds = new Set(playoffStandings.slice(0, playoffSize).map((s) => s.id));
  check(playoffIds.has(champion!), 'champion must be a playoff team', { cfg, seed });

  return { matches, standings, playoffSize, knockoutStartRound, champion, tieResolved, maxHomeAwayImbalance };
}

function assertStandingsValid(standings: TeamStanding[], matches: Match[], byeCounts: Map<string, number>, cfg: Config, seed: number): void {
  // Ranks are a clean 1..N permutation.
  const ranks = standings.map((s) => s.rank).sort((a, b) => a - b);
  ranks.forEach((r, i) => check(r === i + 1, `ranks not 1..N at ${i}: ${r}`, { cfg, seed }));

  // Ordering: wins desc, then cupDiff desc (head-to-head only swaps within equal wins+cupDiff).
  for (let i = 1; i < standings.length; i++) {
    const a = standings[i - 1];
    const b = standings[i];
    check(a.wins >= b.wins, `standings wins not desc at ${i}`, { cfg, seed });
    if (a.wins === b.wins) check(a.cupDiff >= b.cupDiff, `standings cupDiff not desc within equal wins at ${i}`, { cfg, seed });
  }

  // cupDiff = cupsFor - cupsAgainst for everyone (bye credit preserves this).
  for (const s of standings) {
    check(s.cupDiff === s.cupsFor - s.cupsAgainst, `cupDiff invariant broken for ${s.id}`, { cfg, seed, s });
  }

  // Win/loss accounting: Σwins = decided matches + byes; Σlosses = decided matches.
  const decided = matches.filter((m) => m.winner_id && m.loser_id).length;
  const totalByes = [...byeCounts.values()].reduce((a, b) => a + b, 0);
  const sumWins = standings.reduce((a, s) => a + s.wins, 0);
  const sumLosses = standings.reduce((a, s) => a + s.losses, 0);
  check(sumWins === decided + totalByes, `Σwins ${sumWins} != decided ${decided} + byes ${totalByes}`, { cfg, seed });
  check(sumLosses === decided, `Σlosses ${sumLosses} != decided ${decided}`, { cfg, seed });
}

/* ─── Tests ───────────────────────────────────────────────────── */

describe('tournament flow — full end-to-end invariants across configs & seeds', () => {
  for (const cfg of CONFIGS) {
    it(`${cfg.label}: ${cfg.seeds} seeded full tournaments hold all invariants`, () => {
      let worstImbalance = 0;
      let tieResolutionsExercised = 0;
      for (let seed = 1; seed <= cfg.seeds; seed++) {
        Math.random = mulberry32(seed * 2654435761);
        matchSeq = 0;
        try {
          const out = runFlow(cfg, seed);
          worstImbalance = Math.max(worstImbalance, out.maxHomeAwayImbalance);
          if (out.tieResolved) tieResolutionsExercised++;
        } catch (e) {
          if (e instanceof InvariantError) {
            throw new Error(`[${cfg.label} seed=${seed}] ${e.message}`);
          }
          throw e;
        }
      }
      // Surface measured quality metrics (not assertions).
      console.log(`[${cfg.label}] worst home/away imbalance=${worstImbalance}; cutoff-tie resolutions exercised=${tieResolutionsExercised}/${cfg.seeds}`);
    });
  }
});

/* ─── Targeted deterministic tests (no randomness needed) ─────── */

describe('knockout bracket seeding — seed 1 and seed 2 meet only in the final', () => {
  for (const size of [4, 8, 16, 32]) {
    it(`size ${size}: top two seeds never collide before the final`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        Math.random = mulberry32(seed);
        const seeds: TournamentTeam[] = Array.from({ length: size }, (_, i) => ({ id: `s${i + 1}`, name: `Seed ${i + 1}`, wins: size - i, losses: i }));
        let bracket = generateKnockoutBracket(seeds);
        const numRounds = Math.log2(size);

        // top half occupy team1 slots, bottom half team2 slots (round 1).
        const topHalf = new Set(seeds.slice(0, size / 2).map((s) => s.id));
        for (const slot of bracket.rounds[0]) {
          check(topHalf.has(slot.team1Id!), `size ${size}: team1 slot not top-half`, { size, seed });
          check(!topHalf.has(slot.team2Id!), `size ${size}: team2 slot not bottom-half`, { size, seed });
        }

        // s1 and s2 always win; advance the bracket; verify they only share a match at the final.
        for (let r = 0; r < numRounds; r++) {
          const round = bracket.rounds[r];
          const results: MatchResult[] = round.map((slot) => {
            const t1 = slot.team1Id!;
            const t2 = slot.team2Id!;
            // priority winner: s1 > s2 > whoever is team1
            let winner = t1;
            if (t1 === 's2' && t2 !== 's1') winner = t1;
            if (t2 === 's1') winner = t2;
            else if (t2 === 's2' && t1 !== 's1') winner = t2;
            else if (t1 === 's1' || t1 === 's2') winner = t1;
            else winner = t1;
            const loser = winner === t1 ? t2 : t1;
            return { team1Id: t1, team2Id: t2, winnerId: winner, loserId: loser, scoreTeam1: winner === t1 ? 6 : 0, scoreTeam2: winner === t2 ? 6 : 0 };
          });

          const collide = round.find((slot) => (slot.team1Id === 's1' && slot.team2Id === 's2') || (slot.team1Id === 's2' && slot.team2Id === 's1'));
          if (collide) check(r === numRounds - 1, `size ${size}: s1 vs s2 met in round ${r}, not the final`, { size, seed });

          bracket = advanceKnockoutRound(bracket, results, r);
        }
        // Both reached the final.
        const final = bracket.rounds[numRounds - 1][0];
        const finalists = new Set([final.team1Id, final.team2Id]);
        check(finalists.has('s1') && finalists.has('s2'), `size ${size}: s1 & s2 should both reach final`, { size, seed, final });
      }
    });
  }
});

// Head-to-head tiebreak (two teams equal on wins & cupDiff → the direct-meeting
// winner ranks higher) is covered with a real, constructed tie in
// tournament-engine.test.ts ("uses head-to-head when wins and cup diff are equal for
// two teams"), so it is not duplicated here.

describe('applyCutoffTieOrder — reorders the tied group, recomputes ranks, rejects bad input', () => {
  const base: TeamStanding[] = [
    { id: 'W', name: 'W', wins: 5, losses: 0, cupsFor: 0, cupsAgainst: 0, cupDiff: 10, rank: 1 },
    { id: 'X', name: 'X', wins: 3, losses: 2, cupsFor: 0, cupsAgainst: 0, cupDiff: 2, rank: 2 },
    { id: 'Y', name: 'Y', wins: 3, losses: 2, cupsFor: 0, cupsAgainst: 0, cupDiff: 2, rank: 3 },
    { id: 'Z', name: 'Z', wins: 3, losses: 2, cupsFor: 0, cupsAgainst: 0, cupDiff: 2, rank: 4 },
    { id: 'L', name: 'L', wins: 0, losses: 5, cupsFor: 0, cupsAgainst: 0, cupDiff: -10, rank: 5 },
  ];
  it('places the tied group into the given order and renumbers 1..N', () => {
    const out = applyCutoffTieOrder(base, ['Z', 'X', 'Y']);
    check(out.map((s) => s.id).join() === 'W,Z,X,Y,L', `order wrong: ${out.map((s) => s.id).join()}`, {});
    out.forEach((s, i) => check(s.rank === i + 1, 'ranks renumbered', { s }));
    // Non-tied teams untouched at their slots.
    check(out[0].id === 'W' && out[4].id === 'L', 'boundaries preserved', {});
  });
  it('no-ops on duplicate ids, unknown ids, or empty order', () => {
    check(applyCutoffTieOrder(base, []) === base, 'empty → same ref', {});
    check(applyCutoffTieOrder(base, ['X', 'X', 'Y']).map((s) => s.id).join() === base.map((s) => s.id).join(), 'dupes → unchanged', {});
    check(applyCutoffTieOrder(base, ['X', 'Q']).map((s) => s.id).join() === base.map((s) => s.id).join(), 'unknown → unchanged', {});
  });
});

describe('detectUnresolvedCutoffTie — fires only on a tie straddling the cutoff', () => {
  const mk = (id: string, wins: number, cupDiff: number, rank: number): TeamStanding => ({ id, name: id, wins, losses: 0, cupsFor: 0, cupsAgainst: 0, cupDiff, rank });
  it('returns the group when a tie straddles the Top-N boundary', () => {
    // cutoff 2; ranks 2 and 3 tie on wins+cupDiff → straddles.
    const standings = [mk('A', 3, 5, 1), mk('B', 2, 1, 2), mk('C', 2, 1, 3), mk('D', 0, -5, 4)];
    const tie = detectUnresolvedCutoffTie(standings, [], 2);
    check(tie !== null && tie.cutoff === 2, 'should detect', { tie });
    check(new Set(tie!.teamIds).size === 2 && tie!.teamIds.includes('B') && tie!.teamIds.includes('C'), 'group = B,C', { tie });
  });
  it('returns null when the boundary group does not straddle', () => {
    const standings = [mk('A', 3, 5, 1), mk('B', 3, 5, 2), mk('C', 1, 1, 3), mk('D', 0, -5, 4)];
    check(detectUnresolvedCutoffTie(standings, [], 2) === null, 'A,B tie but both inside Top-2 → no straddle', {});
  });
  it('returns null when two straddling teams met head-to-head', () => {
    const standings = [mk('A', 3, 5, 1), mk('B', 2, 1, 2), mk('C', 2, 1, 3), mk('D', 0, -5, 4)];
    const results: MatchResult[] = [{ team1Id: 'B', team2Id: 'C', winnerId: 'B', loserId: 'C', scoreTeam1: 6, scoreTeam2: 4 }];
    check(detectUnresolvedCutoffTie(standings, results, 2) === null, 'h2h resolves the 2-team straddle', {});
  });
});

describe('Swiss bye goes to a lowest-wins eligible team (with a random tie-break)', () => {
  // Regression guard for the shuffle-defeats-sort fix in generateSwissPairings.
  // Before the fix the bye went to a RANDOM eligible team (~46% landed on a 1-win team
  // here); a bye is a credited win (issue #26), so that distorted the standings/cutoff.
  // After the fix the bye must always go to a 0-win team, with the choice among the
  // tied 0-win teams still randomized.
  it('never byes a higher-wins team while a lower-wins eligible one exists, and randomizes ties', () => {
    // Round 1: E sat out (bye). A beat B, C beat D. Round-2 eligible = {A,B,C,D},
    // with A,C on 1 win and B,D on 0 wins. The bye must go to a 0-win team (B or D).
    const engineTeams: TournamentTeam[] = [
      { id: 'A', name: 'A', wins: 1, losses: 0 },
      { id: 'B', name: 'B', wins: 0, losses: 1 },
      { id: 'C', name: 'C', wins: 1, losses: 0 },
      { id: 'D', name: 'D', wins: 0, losses: 1 },
      { id: 'E', name: 'E', wins: 1, losses: 0 }, // got the round-1 bye (excluded from round-2 bye)
    ];
    const round1: MatchResult[] = [
      { team1Id: 'A', team2Id: 'B', winnerId: 'A', loserId: 'B', scoreTeam1: 6, scoreTeam2: 2 },
      { team1Id: 'C', team2Id: 'D', winnerId: 'C', loserId: 'D', scoreTeam1: 6, scoreTeam2: 3 },
    ];

    const byePicks = new Map<string, number>();
    const N = 300;
    for (let seed = 1; seed <= N; seed++) {
      Math.random = mulberry32(seed);
      const rp = generateSwissPairings(engineTeams, round1, 2);
      byePicks.set(rp.bye!, (byePicks.get(rp.bye!) ?? 0) + 1);
    }

    check((byePicks.get('E') ?? 0) === 0, 'E already had a bye and must never get a second one', { e: byePicks.get('E') });
    check((byePicks.get('A') ?? 0) === 0 && (byePicks.get('C') ?? 0) === 0, 'bye must never go to a 1-win team while 0-win teams exist', { a: byePicks.get('A'), c: byePicks.get('C') });
    // Tie-break randomness: both 0-win teams should be picked across seeds.
    check((byePicks.get('B') ?? 0) > 0 && (byePicks.get('D') ?? 0) > 0, 'both lowest-wins teams should be chosen across seeds', { b: byePicks.get('B'), d: byePicks.get('D') });
    console.log(`[bye] over ${N} runs → B:${byePicks.get('B') ?? 0} D:${byePicks.get('D') ?? 0} (A/C/E must be 0)`);
  });
});
