import { describe, it, expect } from 'vitest';
import {
  generateSwissPairings,
  generateKnockoutBracket,
  advanceKnockoutRound,
  calculateRankings,
  type TournamentTeam,
  type MatchResult,
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
  function makeTop8(): TournamentTeam[] {
    return Array.from({ length: 8 }, (_, i) => ({
      id: `seed-${i + 1}`,
      name: `Seed ${i + 1}`,
      wins: 7 - i,
      losses: i,
    }));
  }

  it('creates correct bracket structure: 4 QF, 2 SF, 1 Final', () => {
    const bracket = generateKnockoutBracket(makeTop8());
    expect(bracket.quarterfinals).toHaveLength(4);
    expect(bracket.semifinals).toHaveLength(2);
    expect(bracket.final).toBeDefined();
  });

  it('places seed 1 and seed 2 in opposite halves', () => {
    const bracket = generateKnockoutBracket(makeTop8());

    // Seed 1 in QF0 (top half), Seed 2 in QF3 (bottom half)
    const qf0Teams = [
      bracket.quarterfinals[0].team1Id,
      bracket.quarterfinals[0].team2Id,
    ];
    const qf3Teams = [
      bracket.quarterfinals[3].team1Id,
      bracket.quarterfinals[3].team2Id,
    ];

    expect(qf0Teams).toContain('seed-1');
    expect(qf3Teams).toContain('seed-2');

    // Seed 1 is always team1 (top position)
    expect(bracket.quarterfinals[0].team1Id).toBe('seed-1');
    expect(bracket.quarterfinals[3].team1Id).toBe('seed-2');
  });

  it('places seeds 3-4 in QF1 and QF2 top positions', () => {
    const bracket = generateKnockoutBracket(makeTop8());

    const middleTopSeeds = [
      bracket.quarterfinals[1].team1Id,
      bracket.quarterfinals[2].team1Id,
    ];

    expect(middleTopSeeds).toContain('seed-3');
    expect(middleTopSeeds).toContain('seed-4');
  });

  it('places seeds 5-8 in remaining slots', () => {
    const bracket = generateKnockoutBracket(makeTop8());

    const bottomSlots = [
      bracket.quarterfinals[0].team2Id,
      bracket.quarterfinals[1].team2Id,
      bracket.quarterfinals[2].team2Id,
      bracket.quarterfinals[3].team2Id,
    ];

    for (let i = 5; i <= 8; i++) {
      expect(bottomSlots).toContain(`seed-${i}`);
    }
  });

  it('initializes SF and Final slots as null', () => {
    const bracket = generateKnockoutBracket(makeTop8());

    for (const sf of bracket.semifinals) {
      expect(sf.team1Id).toBeNull();
      expect(sf.team2Id).toBeNull();
    }
    expect(bracket.final.team1Id).toBeNull();
    expect(bracket.final.team2Id).toBeNull();
  });

  it('throws for non-8 team input', () => {
    expect(() =>
      generateKnockoutBracket(makeTeams(6) as TournamentTeam[]),
    ).toThrow();
  });
});

describe('advanceKnockoutRound', () => {
  function setupBracket() {
    const top8: TournamentTeam[] = Array.from({ length: 8 }, (_, i) => ({
      id: `seed-${i + 1}`,
      name: `Seed ${i + 1}`,
      wins: 7 - i,
      losses: i,
    }));
    return generateKnockoutBracket(top8);
  }

  it('fills semifinal slots from QF results', () => {
    const bracket = setupBracket();

    // Simulate QF results: top seeds win
    const qfResults: MatchResult[] = bracket.quarterfinals.map((qf) =>
      simulateResult(qf.team1Id!, qf.team2Id!, true),
    );

    const advanced = advanceKnockoutRound(bracket, qfResults, 'quarterfinals');

    // SF0 gets QF0 winner (team1) and QF1 winner (team1)
    expect(advanced.semifinals[0].team1Id).toBe(bracket.quarterfinals[0].team1Id);
    expect(advanced.semifinals[0].team2Id).toBe(bracket.quarterfinals[1].team1Id);

    // SF1 gets QF2 winner and QF3 winner
    expect(advanced.semifinals[1].team1Id).toBe(bracket.quarterfinals[2].team1Id);
    expect(advanced.semifinals[1].team2Id).toBe(bracket.quarterfinals[3].team1Id);
  });

  it('fills final slots from SF results', () => {
    let bracket = setupBracket();

    // Advance QF
    const qfResults: MatchResult[] = bracket.quarterfinals.map((qf) =>
      simulateResult(qf.team1Id!, qf.team2Id!, true),
    );
    bracket = advanceKnockoutRound(bracket, qfResults, 'quarterfinals');

    // Advance SF
    const sfResults: MatchResult[] = bracket.semifinals.map((sf) =>
      simulateResult(sf.team1Id!, sf.team2Id!, true),
    );
    bracket = advanceKnockoutRound(bracket, sfResults, 'semifinals');

    expect(bracket.final.team1Id).toBe(bracket.semifinals[0].team1Id);
    expect(bracket.final.team2Id).toBe(bracket.semifinals[1].team1Id);
  });

  it('produces a champion end-to-end: QF → SF → Final', () => {
    let bracket = setupBracket();

    // QF
    const qfResults = bracket.quarterfinals.map((qf) =>
      simulateResult(qf.team1Id!, qf.team2Id!, true),
    );
    bracket = advanceKnockoutRound(bracket, qfResults, 'quarterfinals');

    // SF
    const sfResults = bracket.semifinals.map((sf) =>
      simulateResult(sf.team1Id!, sf.team2Id!, true),
    );
    bracket = advanceKnockoutRound(bracket, sfResults, 'semifinals');

    // Final
    expect(bracket.final.team1Id).not.toBeNull();
    expect(bracket.final.team2Id).not.toBeNull();

    const finalResult = simulateResult(
      bracket.final.team1Id!,
      bracket.final.team2Id!,
      true,
    );
    expect(finalResult.winnerId).toBeTruthy();
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

  it('uses Buchholz (opponent wins) as tiebreaker', () => {
    // A beats C (C ends 0W), B beats D, D beats C (D ends 1W)
    // A(1W) Buchholz=0 (opponent C has 0W), B(1W) Buchholz=1 (opponent D has 1W)
    // B should rank above A
    const teamsClean: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'c', name: 'C', wins: 0, losses: 0 },
      { id: 'd', name: 'D', wins: 0, losses: 0 },
    ];
    // Round 1: A beats D, B beats C
    // Round 2: C beats D, A beats... no one (too few teams for clean setup)
    // Simpler: just 2 matches
    // A beats C (C ends with 0 wins), B beats D (D ends with 1 win from somewhere)
    // Nah, let's do:
    // Match 1: A beats C → A: 1W, C: 0W
    // Match 2: B beats D → B: 1W, D: 0W
    // Match 3: D beats C → D: 1W, C: 0W (still)
    // Now A(1W) opponents=[C(0W)] → Buchholz=0
    // B(1W) opponents=[D(1W)] → Buchholz=1
    // B should rank above A
    const resultsClean: MatchResult[] = [
      simulateResult('a', 'c', true),  // A beats C
      simulateResult('b', 'd', true),  // B beats D
      simulateResult('d', 'c', true),  // D beats C
    ];

    const standings = calculateRankings(teamsClean, resultsClean);

    // B and A both have 1 win, but B's opponent (D) has 1 win vs A's opponent (C) has 0
    const aStanding = standings.find((s) => s.id === 'a')!;
    const bStanding = standings.find((s) => s.id === 'b')!;
    expect(bStanding.rank).toBeLessThan(aStanding.rank);
    expect(bStanding.opponentWins).toBeGreaterThan(aStanding.opponentWins);
  });

  it('uses total cups hit as third tiebreaker', () => {
    const teams: TournamentTeam[] = [
      { id: 'a', name: 'A', wins: 0, losses: 0 },
      { id: 'b', name: 'B', wins: 0, losses: 0 },
      { id: 'c', name: 'C', wins: 0, losses: 0 },
    ];

    // A beats C, B beats C — both have 1 win, same Buchholz (C has 0 wins)
    // But A scored more cups
    const results: MatchResult[] = [
      {
        team1Id: 'a',
        team2Id: 'c',
        winnerId: 'a',
        loserId: 'c',
        scoreTeam1: 10,
        scoreTeam2: 3,
      },
      {
        team1Id: 'b',
        team2Id: 'c',
        winnerId: 'b',
        loserId: 'c',
        scoreTeam1: 7,
        scoreTeam2: 3,
      },
    ];

    const standings = calculateRankings(teams, results);
    const aRank = standings.find((s) => s.id === 'a')!.rank;
    const bRank = standings.find((s) => s.id === 'b')!.rank;
    expect(aRank).toBeLessThan(bRank); // A ranked higher (more cups)
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
    expect(bracket.quarterfinals).toHaveLength(4);

    // QF
    const qfResults = bracket.quarterfinals.map((qf) =>
      simulateResult(qf.team1Id!, qf.team2Id!, Math.random() < 0.5),
    );
    bracket = advanceKnockoutRound(bracket, qfResults, 'quarterfinals');

    for (const sf of bracket.semifinals) {
      expect(sf.team1Id).not.toBeNull();
      expect(sf.team2Id).not.toBeNull();
    }

    // SF
    const sfResults = bracket.semifinals.map((sf) =>
      simulateResult(sf.team1Id!, sf.team2Id!, Math.random() < 0.5),
    );
    bracket = advanceKnockoutRound(bracket, sfResults, 'semifinals');

    expect(bracket.final.team1Id).not.toBeNull();
    expect(bracket.final.team2Id).not.toBeNull();

    // Final
    const finalResult = simulateResult(
      bracket.final.team1Id!,
      bracket.final.team2Id!,
      Math.random() < 0.5,
    );

    // We have a champion
    expect(finalResult.winnerId).toBeTruthy();
    expect(top8.map((t) => t.id)).toContain(finalResult.winnerId);
  });
});
