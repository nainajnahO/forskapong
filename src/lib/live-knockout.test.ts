import { describe, it, expect } from 'vitest';
import type { Match } from '@/lib/database.types';
import type { TournamentTeam } from '@/lib/tournament-engine';
import {
  buildLiveBracket,
  nextKnockoutRoundIndex,
  seedFirstKnockoutRound,
  pairKnockoutWinners,
} from './live-knockout';

let idCounter = 0;
function mkMatch(p: Partial<Match>): Match {
  return {
    id: p.id ?? `m${idCounter++}`,
    round: p.round ?? 0,
    wave: p.wave ?? 1,
    table_number: p.table_number ?? 1,
    team1_id: p.team1_id ?? 't1',
    team2_id: p.team2_id ?? 't2',
    winner_id: p.winner_id ?? null,
    loser_id: p.loser_id ?? null,
    confirmed: p.confirmed ?? false,
    score_team1: p.score_team1 ?? null,
    score_team2: p.score_team2 ?? null,
    reported_by: p.reported_by ?? null,
    confirmed_by: p.confirmed_by ?? null,
    created_at: p.created_at ?? '2026-01-01',
    scheduled_time: p.scheduled_time ?? null,
  };
}

/**
 * Generated knockout rounds insert matches in bracket order, and
 * assignTablesAndWaves lays them out sequentially: two matches per wave (2 tables),
 * so (wave, table) ascending recovers bracket index. This mirrors that layout for
 * `count` matches and returns them in a deliberately scrambled array order so the
 * tests prove the sort (not the array order) recovers the bracket.
 */
function bracketOrderedRound(round: number, pairs: [string, string][]): Match[] {
  const rows = pairs.map(([t1, t2], i) =>
    mkMatch({
      round,
      wave: Math.floor(i / 2) + 1,
      table_number: (i % 2) + 1,
      team1_id: t1,
      team2_id: t2,
    }),
  );
  // Scramble array order; (wave, table) still encodes bracket index i.
  return [...rows].reverse();
}

const START = 8; // knockout starts at round 8 (7 swiss rounds)

describe('buildLiveBracket', () => {
  function firstRoundPairs(size: number): [string, string][] {
    return Array.from({ length: size / 2 }, (_, i) => [`a${2 * i}`, `a${2 * i + 1}`] as [string, string]);
  }

  it.each([
    [8, 3, ['Kvartsfinal', 'Semifinal', 'Final'], [4, 2, 1]],
    [16, 4, ['Åttondelsfinal', 'Kvartsfinal', 'Semifinal', 'Final'], [8, 4, 2, 1]],
    [32, 5, ['Sextondelsfinal', 'Åttondelsfinal', 'Kvartsfinal', 'Semifinal', 'Final'], [16, 8, 4, 2, 1]],
  ] as const)('size %i: builds %i rounds with correct labels and slot counts', (size, numRounds, labels, slotCounts) => {
    const matches = bracketOrderedRound(START, firstRoundPairs(size));
    const bracket = buildLiveBracket(matches, START, size)!;
    expect(bracket).not.toBeNull();
    expect(bracket.rounds).toHaveLength(numRounds);
    expect(bracket.labels).toEqual(labels);
    expect(bracket.rounds.map((r) => r.length)).toEqual(slotCounts);
  });

  it('recovers bracket order from out-of-order (wave, table) rows', () => {
    const pairs: [string, string][] = [
      ['a0', 'a1'], ['a2', 'a3'], ['a4', 'a5'], ['a6', 'a7'],
      ['a8', 'a9'], ['a10', 'a11'], ['a12', 'a13'], ['a14', 'a15'],
    ];
    const matches = bracketOrderedRound(START, pairs); // array is reversed
    const bracket = buildLiveBracket(matches, START, 16)!;
    // round 0 slot i must hold pair i despite the scrambled array order
    bracket.rounds[0].forEach((slot, i) => {
      expect([slot.team1Id, slot.team2Id]).toEqual(pairs[i]);
    });
  });

  it('leaves ungenerated rounds empty (TBD)', () => {
    const bracket = buildLiveBracket(bracketOrderedRound(START, firstRoundPairs(16)), START, 16)!;
    for (const round of bracket.rounds.slice(1)) {
      for (const slot of round) {
        expect(slot.team1Id).toBeNull();
        expect(slot.team2Id).toBeNull();
      }
    }
  });

  it('fills a later round from its own rows', () => {
    const r16 = bracketOrderedRound(START, firstRoundPairs(16));
    const qf = bracketOrderedRound(START + 1, [
      ['w0', 'w1'], ['w2', 'w3'], ['w4', 'w5'], ['w6', 'w7'],
    ]);
    const bracket = buildLiveBracket([...r16, ...qf], START, 16)!;
    expect(bracket.rounds[1].map((s) => [s.team1Id, s.team2Id])).toEqual([
      ['w0', 'w1'], ['w2', 'w3'], ['w4', 'w5'], ['w6', 'w7'],
    ]);
  });

  it('returns null until the first round is fully generated', () => {
    const partial = bracketOrderedRound(START, firstRoundPairs(16)).slice(0, 5);
    expect(buildLiveBracket(partial, START, 16)).toBeNull();
    expect(buildLiveBracket([], START, 16)).toBeNull();
  });
});

describe('nextKnockoutRoundIndex', () => {
  it('is 0 when no knockout rounds exist yet', () => {
    expect(nextKnockoutRoundIndex([], START)).toBe(0);
    // swiss-only rows below the knockout start don't count
    expect(nextKnockoutRoundIndex([mkMatch({ round: 7 })], START)).toBe(0);
  });

  it('advances one past the highest generated knockout round', () => {
    const r16 = [mkMatch({ round: START })];
    expect(nextKnockoutRoundIndex(r16, START)).toBe(1);
    const through_qf = [mkMatch({ round: START }), mkMatch({ round: START + 1 })];
    expect(nextKnockoutRoundIndex(through_qf, START)).toBe(2);
    const through_final = [START, START + 1, START + 2, START + 3].map((round) => mkMatch({ round }));
    expect(nextKnockoutRoundIndex(through_final, START)).toBe(4); // == numRounds(16) → complete
  });
});

describe('pairKnockoutWinners', () => {
  // No prior-knockout history is passed, so decideKnockoutHomeTeam falls back to the
  // standings rank map — making orientation deterministic for the assertions.
  const rankMap = new Map<string, number>(
    Array.from({ length: 16 }, (_, i) => [`w${i}`, i + 1]),
  );

  it('pairs adjacent winners in bracket order, even from scrambled rows', () => {
    // Round-of-16 (8 matches) whose winners, in bracket order, are w0..w7.
    const prev = bracketOrderedRound(START, [
      ['w0', 'x0'], ['w1', 'x1'], ['w2', 'x2'], ['w3', 'x3'],
      ['w4', 'x4'], ['w5', 'x5'], ['w6', 'x6'], ['w7', 'x7'],
    ]).map((m) => ({ ...m, confirmed: true, winner_id: m.team1_id }));

    const pairings = pairKnockoutWinners(prev, START + 1, START, prev, rankMap);
    expect(pairings).toHaveLength(4);
    // pairing k must contain winners 2k and 2k+1
    pairings.forEach((p, k) => {
      expect(new Set([p.homeTeamId, p.awayTeamId])).toEqual(new Set([`w${2 * k}`, `w${2 * k + 1}`]));
    });
  });

  it('orients the higher seed (lower rank) as home via the standings fallback', () => {
    const prev = bracketOrderedRound(START, [['w0', 'x'], ['w1', 'y']]).map((m) => ({
      ...m,
      confirmed: true,
      winner_id: m.team1_id,
    }));
    const [pairing] = pairKnockoutWinners(prev, START + 1, START, prev, rankMap);
    expect(pairing.homeTeamId).toBe('w0'); // rank 1 < rank 2
    expect(pairing.awayTeamId).toBe('w1');
  });
});

describe('seedFirstKnockoutRound', () => {
  function seeds(n: number): TournamentTeam[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `seed-${i + 1}`,
      name: `Seed ${i + 1}`,
      wins: n - i,
      losses: i,
    }));
  }

  it.each([8, 16, 32])('produces size/2 pairings covering every seed for size %i', (size) => {
    const rankMap = new Map(seeds(size).map((s, i) => [s.id, i + 1]));
    const pairings = seedFirstKnockoutRound(seeds(size), [], START, rankMap);
    expect(pairings).toHaveLength(size / 2);
    const placed = pairings.flatMap((p) => [p.homeTeamId, p.awayTeamId]);
    expect(new Set(placed).size).toBe(size); // every seed appears exactly once
    for (const p of pairings) expect(p.homeTeamId).not.toBe(p.awayTeamId);
  });
});
