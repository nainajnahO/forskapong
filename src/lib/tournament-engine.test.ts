import { describe, it, expect } from 'vitest';
import {
  generateSwissPairings,
  generateKnockoutBracket,
  advanceKnockoutRound,
  calculateRankings,
  deriveByes,
  countByesPerTeam,
  detectUnresolvedCutoffTie,
  applyCutoffTieOrder,
  type TournamentTeam,
  type MatchResult,
  type TeamStanding,
} from './tournament-engine';

/* ─── Helpers ─────────────────────────────────────────────────── */

function makeTeams(count: number): TournamentTeam[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    wins: 0,
    losses: 0,
  }));
}

/** Simulate a match result. Winner is team1 by default. */
function simulateResult(
  team1Id: string,
  team2Id: string,
  winnerIsTeam1 = true,
): MatchResult {
  return {
    team1Id,
    team2Id,
    winnerId: winnerIsTeam1 ? team1Id : team2Id,
    loserId: winnerIsTeam1 ? team2Id : team1Id,
    scoreTeam1: winnerIsTeam1 ? 10 : 5,
    scoreTeam2: winnerIsTeam1 ? 5 : 10,
  };
}

/** Simulate a full round: randomly pick winner for each pairing. */
function simulateRound(
  teams: TournamentTeam[],
  allResults: MatchResult[],
  round: number,
): MatchResult[] {
  const pairings = generateSwissPairings(teams, allResults, round);
  const roundResults: MatchResult[] = [];

  for (const p of pairings.pairings) {
    const winnerIsTeam1 = Math.random() < 0.5;
    const result = simulateResult(p.team1Id, p.team2Id, winnerIsTeam1);
    roundResults.push(result);

    // Update team records
    const winner = teams.find((t) => t.id === result.winnerId)!;
    const loser = teams.find((t) => t.id === result.loserId)!;
    winner.wins += 1;
    loser.losses += 1;
  }

  return roundResults;
}

/* ─── Swiss Pairing Tests ─────────────────────────────────────── */

describe('generateSwissPairings', () => {
  it('pairs all 32 teams into 16 matches', () => {
    const teams = makeTeams(32);
    const result = generateSwissPairings(teams, [], 1);

    expect(result.pairings).toHaveLength(16);
    expect(result.bye).toBeNull();

    const allTeamIds = result.pairings.flatMap((p) => [p.team1Id, p.team2Id]);
    expect(new Set(allTeamIds).size).toBe(32);
  });

  it('produces no rematches across 7 rounds with 32 teams', () => {
    const teams = makeTeams(32);
    const allResults: MatchResult[] = [];
    const allPairingKeys = new Set<string>();

    for (let round = 1; round <= 7; round++) {
      const roundResults = simulateRound(teams, allResults, round);

      for (const r of roundResults) {
        const key = [r.team1Id, r.team2Id].sort().join('-');
        expect(allPairingKeys.has(key)).toBe(false);
        allPairingKeys.add(key);
      }

      allResults.push(...roundResults);
    }

    // 7 rounds x 16 matches = 112 unique pairings
    expect(allPairingKeys.size).toBe(112);
  });

  it('prefers same-wins pairings', () => {
    const teams = makeTeams(32);
    const allResults: MatchResult[] = [];

    // Play 3 rounds to create win differentiation
    for (let round = 1; round <= 3; round++) {
      const roundResults = simulateRound(teams, allResults, round);
      allResults.push(...roundResults);
    }

    // In round 4, check that the majority of pairings have same win count
    const round4 = generateSwissPairings(teams, allResults, 4);
    let sameWinsPairings = 0;
    for (const p of round4.pairings) {
      const t1 = teams.find((t) => t.id === p.team1Id)!;
      const t2 = teams.find((t) => t.id === p.team2Id)!;
      if (t1.wins === t2.wins) sameWinsPairings++;
    }

    // With 32 teams after 3 rounds, most pairings should match wins
    expect(sameWinsPairings).toBeGreaterThan(round4.pairings.length / 2);
  });

  it('assigns one bye for odd team count', () => {
    const teams = makeTeams(31);
    const result = generateSwissPairings(teams, [], 1);

    expect(result.pairings).toHaveLength(15);
    expect(result.bye).not.toBeNull();
    expect(teams.some((t) => t.id === result.bye)).toBe(true);

    // Bye team should not appear in any pairing
    const pairedIds = result.pairings.flatMap((p) => [p.team1Id, p.team2Id]);
    expect(pairedIds).not.toContain(result.bye);
  });

  it('gives bye to different teams across rounds', () => {
    const teams = makeTeams(31);
    const allResults: MatchResult[] = [];
    const byeRecipients: string[] = [];

    for (let round = 1; round <= 3; round++) {
      const pairings = generateSwissPairings(teams, allResults, round);
      expect(pairings.bye).not.toBeNull();
      byeRecipients.push(pairings.bye!);

      // Simulate round results
      for (const p of pairings.pairings) {
        const result = simulateResult(p.team1Id, p.team2Id, Math.random() < 0.5);
        allResults.push(result);
        const winner = teams.find((t) => t.id === result.winnerId)!;
        const loser = teams.find((t) => t.id === result.loserId)!;
        winner.wins += 1;
        loser.losses += 1;
      }
    }

    // Each round should give bye to a different team
    expect(new Set(byeRecipients).size).toBe(3);
  });

  it('ensures every team plays exactly 7 games in a full 7-round simulation', () => {
    const teams = makeTeams(32);
    const allResults: MatchResult[] = [];

    for (let round = 1; round <= 7; round++) {
      const roundResults = simulateRound(teams, allResults, round);
      allResults.push(...roundResults);
    }

    // Every team played exactly 7 games
    for (const team of teams) {
      expect(team.wins + team.losses).toBe(7);
    }

    // Total wins = total losses = 112 (16 matches/round x 7 rounds)
    const totalWins = teams.reduce((s, t) => s + t.wins, 0);
    const totalLosses = teams.reduce((s, t) => s + t.losses, 0);
    expect(totalWins).toBe(112);
    expect(totalLosses).toBe(112);
  });
});

/* ─── Knockout Bracket Tests ──────────────────────────────────── */

describe('generateKnockoutBracket', () => {
  /** Seeds in rank order: seed-1 is the top seed. */
  function makeSeeds(n: number): TournamentTeam[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `seed-${i + 1}`,
      name: `Seed ${i + 1}`,
      wins: n - i,
      losses: i,
    }));
  }

  it.each([
    [2, 1, ['Final']],
    [4, 2, ['Semifinal', 'Final']],
    [8, 3, ['Kvartsfinal', 'Semifinal', 'Final']],
    [16, 4, ['Åttondelsfinal', 'Kvartsfinal', 'Semifinal', 'Final']],
    [32, 5, ['Sextondelsfinal', 'Åttondelsfinal', 'Kvartsfinal', 'Semifinal', 'Final']],
  ] as const)('builds a %i-team bracket: %i rounds with halving match counts and correct labels', (size, numRounds, labels) => {
    const bracket = generateKnockoutBracket(makeSeeds(size));
    expect(bracket.rounds).toHaveLength(numRounds);
    expect(bracket.labels).toEqual(labels);
    // round r has size / 2^(r+1) matches: size/2, size/4, … 1
    bracket.rounds.forEach((round, r) => {
      expect(round).toHaveLength(size / 2 ** (r + 1));
    });
    // every team appears exactly once in the first round, all later rounds are empty
    const firstRoundTeams = bracket.rounds[0].flatMap((m) => [m.team1Id, m.team2Id]);
    expect(new Set(firstRoundTeams).size).toBe(size);
    for (const round of bracket.rounds.slice(1)) {
      for (const m of round) {
        expect(m.team1Id).toBeNull();
        expect(m.team2Id).toBeNull();
      }
    }
  });

  // The 06-06 event runs size 8 — these are the legacy invariants, now on rounds[0].
  describe('size-8 regression (legacy randomized-tier layout)', () => {
    it('anchors seed 1 at the first match top and seed 2 at the last match top', () => {
      const r0 = generateKnockoutBracket(makeSeeds(8)).rounds[0];
      expect(r0[0].team1Id).toBe('seed-1');
      expect(r0[3].team1Id).toBe('seed-2');
    });

    it('shuffles seeds 3-4 into the middle top slots', () => {
      const r0 = generateKnockoutBracket(makeSeeds(8)).rounds[0];
      expect([r0[1].team1Id, r0[2].team1Id]).toEqual(
        expect.arrayContaining(['seed-3', 'seed-4']),
      );
    });

    it('shuffles seeds 5-8 across the bottom slots', () => {
      const r0 = generateKnockoutBracket(makeSeeds(8)).rounds[0];
      const bottom = r0.map((m) => m.team2Id);
      for (let i = 5; i <= 8; i++) expect(bottom).toContain(`seed-${i}`);
    });

    it('places seed 1 and seed 2 in opposite halves (can only meet in the final)', () => {
      const r0 = generateKnockoutBracket(makeSeeds(8)).rounds[0];
      // matches 0,1 feed SF0; matches 2,3 feed SF1
      const seed1Match = r0.findIndex((m) => m.team1Id === 'seed-1' || m.team2Id === 'seed-1');
      const seed2Match = r0.findIndex((m) => m.team1Id === 'seed-2' || m.team2Id === 'seed-2');
      expect(Math.floor(seed1Match / 2)).not.toBe(Math.floor(seed2Match / 2));
    });
  });

  it('throws for a non-power-of-2 field', () => {
    expect(() => generateKnockoutBracket(makeTeams(6))).toThrow();
    expect(() => generateKnockoutBracket(makeTeams(1))).toThrow();
  });
});

describe('advanceKnockoutRound', () => {
  function makeSeeds(n: number): TournamentTeam[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `seed-${i + 1}`,
      name: `Seed ${i + 1}`,
      wins: n - i,
      losses: i,
    }));
  }

  it('routes a match winner to the correct next-round slot (top if even, bottom if odd)', () => {
    const bracket = generateKnockoutBracket(makeSeeds(8));
    const r0 = bracket.rounds[0];
    const results = r0.map((m) => simulateResult(m.team1Id!, m.team2Id!, true));
    const advanced = advanceKnockoutRound(bracket, results, 0);
    // match0 winner → SF0.team1, match1 winner → SF0.team2, etc.
    expect(advanced.rounds[1][0].team1Id).toBe(r0[0].team1Id);
    expect(advanced.rounds[1][0].team2Id).toBe(r0[1].team1Id);
    expect(advanced.rounds[1][1].team1Id).toBe(r0[2].team1Id);
    expect(advanced.rounds[1][1].team2Id).toBe(r0[3].team1Id);
  });

  it('is a no-op on the final round (no next round to fill)', () => {
    const bracket = generateKnockoutBracket(makeSeeds(2));
    const results = [simulateResult(bracket.rounds[0][0].team1Id!, bracket.rounds[0][0].team2Id!, true)];
    const advanced = advanceKnockoutRound(bracket, results, 0);
    expect(advanced.rounds).toHaveLength(1);
  });

  // Top seed always sits in team1 and team1 always wins → seed-1 wins every size.
  it.each([2, 4, 8, 16, 32])('crowns a champion end-to-end for size %i', (size) => {
    let bracket = generateKnockoutBracket(makeSeeds(size));
    for (let r = 0; r < bracket.rounds.length; r++) {
      const round = bracket.rounds[r];
      // every slot in the round being played must be filled
      for (const m of round) {
        expect(m.team1Id).not.toBeNull();
        expect(m.team2Id).not.toBeNull();
      }
      const results = round.map((m) => simulateResult(m.team1Id!, m.team2Id!, true));
      if (r < bracket.rounds.length - 1) bracket = advanceKnockoutRound(bracket, results, r);
    }
    const finalMatch = bracket.rounds[bracket.rounds.length - 1][0];
    expect(finalMatch.team1Id).toBe('seed-1');
  });
});

/* ─── Rankings Tests ──────────────────────────────────────────── */

describe('calculateRankings', () => {
  it('sorts by wins descending', () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'c', name: 'C', wins: 0, losses: 0 },
    ];
    const results: MatchResult[] = [
      simulateResult('a', 'b', false), // B wins
      simulateResult('b', 'c', true),  // B wins again
      simulateResult('a', 'c', true),  // A wins
    ];

    const standings = calculateRankings(teams, results);
    expect(standings[0].id).toBe('b'); // 2 wins
    expect(standings[1].id).toBe('a'); // 1 win
    expect(standings[2].id).toBe('c'); // 0 wins
  });

  it('uses cup difference as second tiebreaker', () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'c', name: 'C', wins: 0, losses: 0 },
    ];

    // A and B both finish with 1 win, but A has better cup diff.
    const results: MatchResult[] = [
      {
        team1Id: 'a',
        team2Id: 'c',
        winnerId: 'a',
        loserId: 'c',
        scoreTeam1: 6,
        scoreTeam2: 2, // A diff +4
      },
      {
        team1Id: 'b',
        team2Id: 'c',
        winnerId: 'b',
        loserId: 'c',
        scoreTeam1: 6,
        scoreTeam2: 5, // B diff +1
      },
    ];

    const standings = calculateRankings(teams, results);
    const aRank = standings.find((s) => s.id === 'a')!.rank;
    const bRank = standings.find((s) => s.id === 'b')!.rank;
    expect(aRank).toBeLessThan(bRank);
  });

  it('uses head-to-head when wins and cup diff are equal for two teams', () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'c', name: 'C', wins: 0, losses: 0 },
      { id: 'd', name: 'D', wins: 0, losses: 0 },
    ];

    const results: MatchResult[] = [
      // A beats B directly (head-to-head)
      { team1Id: 'a', team2Id: 'b', winnerId: 'a', loserId: 'b', scoreTeam1: 6, scoreTeam2: 5 },
      // Both then lose with same margin -> same wins and cup diff.
      { team1Id: 'a', team2Id: 'c', winnerId: 'c', loserId: 'a', scoreTeam1: 4, scoreTeam2: 6 },
      { team1Id: 'b', team2Id: 'd', winnerId: 'd', loserId: 'b', scoreTeam1: 4, scoreTeam2: 6 },
    ];

    const standings = calculateRankings(teams, results);
    const aRank = standings.find((s) => s.id === 'a')!.rank;
    const bRank = standings.find((s) => s.id === 'b')!.rank;
    expect(aRank).toBeLessThan(bRank);
  });

  it('assigns correct rank numbers', () => {
    const teams = makeTeams(4);
    const results: MatchResult[] = [
      simulateResult('team-1', 'team-2', true),
      simulateResult('team-3', 'team-4', true),
      simulateResult('team-1', 'team-3', true),
      simulateResult('team-2', 'team-4', true),
    ];

    const standings = calculateRankings(teams, results);
    expect(standings.map((s) => s.rank)).toEqual([1, 2, 3, 4]);
  });

  it('flags unresolved tie at playoff cutoff when teams never met', () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'c', name: 'C', wins: 0, losses: 0 },
      { id: 'd', name: 'D', wins: 0, losses: 0 },
    ];
    const results: MatchResult[] = [
      { team1Id: 'a', team2Id: 'c', winnerId: 'a', loserId: 'c', scoreTeam1: 6, scoreTeam2: 4 },
      { team1Id: 'b', team2Id: 'd', winnerId: 'b', loserId: 'd', scoreTeam1: 6, scoreTeam2: 4 },
    ];
    const standings = calculateRankings(teams, results);
    const warning = detectUnresolvedCutoffTie(standings, results, 1);

    expect(warning).not.toBeNull();
    expect(new Set(warning?.teamIds)).toEqual(new Set(['a', 'b']));
  });
});

/* ─── Bye Derivation + Credit Tests (issue #26) ───────────────── */

describe('deriveByes', () => {
  it('returns no byes for an even field where everyone plays', () => {
    const matches = [
      { round: 1, team1Id: 'a', team2Id: 'b' },
      { round: 1, team1Id: 'c', team2Id: 'd' },
    ];
    expect(deriveByes(['a', 'b', 'c', 'd'], matches).size).toBe(0);
  });

  it('flags the one team absent from an odd round', () => {
    const matches = [
      { round: 1, team1Id: 'a', team2Id: 'b' },
      { round: 1, team1Id: 'c', team2Id: 'd' },
      // e sits out round 1
      { round: 2, team1Id: 'a', team2Id: 'e' },
      { round: 2, team1Id: 'b', team2Id: 'c' },
      // d sits out round 2
    ];
    const byes = deriveByes(['a', 'b', 'c', 'd', 'e'], matches);
    expect(byes.get(1)).toBe('e');
    expect(byes.get(2)).toBe('d');
  });

  it('ignores knockout rounds where many teams are absent', () => {
    const teamIds = Array.from({ length: 12 }, (_, i) => `t${i + 1}`);
    // A 4-match quarterfinal: 8 of 12 teams play, 4 are absent — not a bye.
    const matches = [
      { round: 8, team1Id: 't1', team2Id: 't2' },
      { round: 8, team1Id: 't3', team2Id: 't4' },
      { round: 8, team1Id: 't5', team2Id: 't6' },
      { round: 8, team1Id: 't7', team2Id: 't8' },
    ];
    expect(deriveByes(teamIds, matches).size).toBe(0);
  });

  it('ignores rounds that have no matches yet', () => {
    const matches = [{ round: 1, team1Id: 'a', team2Id: 'b' }];
    const byes = deriveByes(['a', 'b', 'c'], matches);
    // Round 1 has both a and b; c is absent -> that's a real bye.
    expect(byes.get(1)).toBe('c');
    // No round 2 rows exist, so no phantom round-2 bye.
    expect(byes.has(2)).toBe(false);
  });
});

describe('countByesPerTeam', () => {
  it('counts repeated byes per team', () => {
    const byeRounds = new Map<number, string>([
      [1, 'a'],
      [2, 'b'],
      [3, 'a'],
    ]);
    const counts = countByesPerTeam(byeRounds);
    expect(counts.get('a')).toBe(2);
    expect(counts.get('b')).toBe(1);
    expect(counts.has('c')).toBe(false);
  });
});

describe('calculateRankings bye credit', () => {
  it('credits a bye as a win', () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'c', name: 'C', wins: 0, losses: 0 },
    ];
    // a beats b (margin 5); c got a bye.
    const results = [simulateResult('a', 'b', true)];
    const standings = calculateRankings(teams, results, new Map([['c', 1]]));

    const c = standings.find((s) => s.id === 'c')!;
    const b = standings.find((s) => s.id === 'b')!;
    expect(c.wins).toBe(1); // bye is a win
    expect(b.wins).toBe(0);
    expect(c.rank).toBeLessThan(b.rank); // bye team outranks the 0-win team
  });

  it("credits cup-diff = the bye team's average margin of victory", () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'c', name: 'C', wins: 0, losses: 0 },
      { id: 'd', name: 'D', wins: 0, losses: 0 },
    ];
    // a wins twice, each by 5 cups (10-5) -> avg margin 5. a also gets a bye.
    const results = [simulateResult('a', 'b', true), simulateResult('a', 'c', true)];
    const standings = calculateRankings(teams, results, new Map([['a', 1]]));

    const a = standings.find((s) => s.id === 'a')!;
    expect(a.wins).toBe(3); // 2 real + 1 bye
    // Real cup-diff +10, plus the bye credit of +5 (avg winning margin).
    expect(a.cupDiff).toBe(15);
  });

  it('rounds a fractional average margin to whole cups', () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'c', name: 'C', wins: 0, losses: 0 },
    ];
    // a wins by 3 then by 4 -> avg 3.5, rounds to 4.
    const results: MatchResult[] = [
      { team1Id: 'a', team2Id: 'b', winnerId: 'a', loserId: 'b', scoreTeam1: 10, scoreTeam2: 7 },
      { team1Id: 'a', team2Id: 'c', winnerId: 'a', loserId: 'c', scoreTeam1: 10, scoreTeam2: 6 },
    ];
    const standings = calculateRankings(teams, results, new Map([['a', 1]]));

    const a = standings.find((s) => s.id === 'a')!;
    // Real cup-diff +7 (3 + 4), plus rounded bye credit +4.
    expect(a.cupDiff).toBe(11);
  });

  it('falls back to the tournament-wide average winning margin when the team has no win', () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'x', name: 'X', wins: 0, losses: 0 },
    ];
    // Tournament winning margins: 3 and 4 -> avg 3.5 -> rounds to 4.
    // x only lost (cup-diff -4) and got a bye -> credit +4 -> net 0.
    const results: MatchResult[] = [
      { team1Id: 'a', team2Id: 'b', winnerId: 'a', loserId: 'b', scoreTeam1: 10, scoreTeam2: 7 },
      { team1Id: 'a', team2Id: 'x', winnerId: 'a', loserId: 'x', scoreTeam1: 10, scoreTeam2: 6 },
    ];
    const standings = calculateRankings(teams, results, new Map([['x', 1]]));

    const x = standings.find((s) => s.id === 'x')!;
    expect(x.wins).toBe(1); // the bye
    expect(x.cupDiff).toBe(0); // -4 real + 4 fallback credit
  });

  it('leaves standings unchanged when no byes are passed', () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
    ];
    const results = [simulateResult('a', 'b', true)];
    const standings = calculateRankings(teams, results);
    expect(standings.find((s) => s.id === 'a')!.wins).toBe(1);
    expect(standings.find((s) => s.id === 'b')!.wins).toBe(0);
  });
});

/* ─── N-way Cutoff Tie Ordering Tests ─────────────────────────── */

describe('applyCutoffTieOrder', () => {
  function standing(id: string, rank: number, wins = 3, cupDiff = 5): TeamStanding {
    return {
      id,
      name: id.toUpperCase(),
      wins,
      losses: 0,
      cupsFor: 0,
      cupsAgainst: 0,
      cupDiff,
      rank,
    };
  }

  it('reorders a 3-team tied block into the admin order and re-ranks', () => {
    // a, b, c are tied in the middle slots; top/bot bracket them.
    const standings: TeamStanding[] = [
      standing('top', 1, 4, 9),
      standing('a', 2),
      standing('b', 3),
      standing('c', 4),
      standing('bot', 5, 2, 1),
    ];
    const result = applyCutoffTieOrder(standings, ['c', 'a', 'b']);
    expect(result.map((s) => s.id)).toEqual(['top', 'c', 'a', 'b', 'bot']);
    expect(result.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('generalizes the 2-team RPS swap', () => {
    const standings: TeamStanding[] = [standing('a', 1), standing('b', 2)];
    const result = applyCutoffTieOrder(standings, ['b', 'a']);
    expect(result.map((s) => s.id)).toEqual(['b', 'a']);
    expect(result.map((s) => s.rank)).toEqual([1, 2]);
  });

  it('is a no-op for an empty order', () => {
    const standings: TeamStanding[] = [standing('a', 1), standing('b', 2)];
    expect(applyCutoffTieOrder(standings, [])).toBe(standings);
  });

  it('is a no-op for an order with duplicates or unknown teams', () => {
    const standings: TeamStanding[] = [standing('a', 1), standing('b', 2), standing('c', 3)];
    expect(applyCutoffTieOrder(standings, ['a', 'a'])).toBe(standings);
    expect(applyCutoffTieOrder(standings, ['a', 'b', 'ghost'])).toBe(standings);
  });

  it('does not mutate the input standings', () => {
    const standings: TeamStanding[] = [standing('a', 1), standing('b', 2)];
    const snapshot = standings.map((s) => ({ ...s }));
    applyCutoffTieOrder(standings, ['b', 'a']);
    expect(standings).toEqual(snapshot);
  });

  it('detect → order → slice qualifies the admin-chosen team when the cutoff is inside the tie', () => {
    // A wins everything; B, C, D form a 3-way cycle → all 1 win, equal cup diff.
    const teams: TournamentTeam[] = [
      { id: 'A', name: 'A', wins: 0, losses: 0 },
      { id: 'B', name: 'B', wins: 0, losses: 0 },
      { id: 'C', name: 'C', wins: 0, losses: 0 },
      { id: 'D', name: 'D', wins: 0, losses: 0 },
    ];
    const win = (t1: string, t2: string): MatchResult => ({
      team1Id: t1,
      team2Id: t2,
      winnerId: t1,
      loserId: t2,
      scoreTeam1: 6,
      scoreTeam2: 4,
    });
    const results: MatchResult[] = [
      win('A', 'B'),
      win('A', 'C'),
      win('A', 'D'),
      win('B', 'C'),
      win('C', 'D'),
      win('D', 'B'),
    ];

    const standings = calculateRankings(teams, results);
    expect(standings[0].id).toBe('A'); // clear #1

    // Cutoff falls inside the tie: B/C/D straddle the Top-2 line (ranks 2–4).
    const cutoff = 2;
    const tie = detectUnresolvedCutoffTie(standings, results, cutoff);
    expect(tie).not.toBeNull();
    expect(new Set(tie?.teamIds)).toEqual(new Set(['B', 'C', 'D']));

    // Admin orders the tied group D > C > B → D takes the final qualifying slot.
    const resolved = applyCutoffTieOrder(standings, ['D', 'C', 'B']);
    expect(resolved.map((s) => s.id)).toEqual(['A', 'D', 'C', 'B']);
    expect(resolved.slice(0, cutoff).map((s) => s.id)).toEqual(['A', 'D']);
  });
});

/* ─── End-to-End Tournament Test ──────────────────────────────── */

describe('full tournament simulation', () => {
  it('runs 32 teams through 7 Swiss rounds → top 8 → knockout → champion', () => {
    const teams = makeTeams(32);
    const allResults: MatchResult[] = [];

    // 7 Swiss rounds
    for (let round = 1; round <= 7; round++) {
      const roundResults = simulateRound(teams, allResults, round);
      allResults.push(...roundResults);
    }

    // Calculate rankings
    const standings = calculateRankings(teams, allResults);
    expect(standings).toHaveLength(32);
    expect(standings[0].rank).toBe(1);
    expect(standings[31].rank).toBe(32);

    // Top 8 go to knockout
    const top8: TournamentTeam[] = standings.slice(0, 8).map((s) => ({
      id: s.id,
      name: s.name,
      wins: s.wins,
      losses: s.losses,
    }));

    let bracket = generateKnockoutBracket(top8);
    expect(bracket.rounds).toHaveLength(3); // QF, SF, Final
    expect(bracket.rounds[0]).toHaveLength(4);

    // Play QF and SF, advancing the winners through the bracket.
    for (let r = 0; r < bracket.rounds.length - 1; r++) {
      const round = bracket.rounds[r];
      for (const m of round) {
        expect(m.team1Id).not.toBeNull();
        expect(m.team2Id).not.toBeNull();
      }
      const results = round.map((m) =>
        simulateResult(m.team1Id!, m.team2Id!, Math.random() < 0.5),
      );
      bracket = advanceKnockoutRound(bracket, results, r);
    }

    // Final
    const finalMatch = bracket.rounds[bracket.rounds.length - 1][0];
    expect(finalMatch.team1Id).not.toBeNull();
    expect(finalMatch.team2Id).not.toBeNull();
    const finalResult = simulateResult(
      finalMatch.team1Id!,
      finalMatch.team2Id!,
      Math.random() < 0.5,
    );

    // We have a champion
    expect(finalResult.winnerId).toBeTruthy();
    expect(top8.map((t) => t.id)).toContain(finalResult.winnerId);
  });
});
