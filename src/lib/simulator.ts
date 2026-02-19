import type {
  TournamentTeam,
  MatchResult,
  Pairing,
  BracketSlot,
} from './tournament-engine';

/* ─── Types ───────────────────────────────────────────────────── */

export interface SimConfig {
  teamCount: number;
  swissRounds: number;
  knockoutSize: 4 | 8 | 16;
  strengthBias: boolean;
}

export interface SimBracket {
  rounds: BracketSlot[][];
  labels: string[];
}

export interface VerificationStats {
  rematches: number;
  totalMatches: number;
  maxByes: number;
  winDistribution: number[];
  buchholzCorrelation: number;
  avgScoreDiffPerRound: number[];
}

export interface BatchResults {
  avgRankBySeed: number[];
  topNFrequency: number[];
  championDistribution: Map<number, number>;
  simulationsRun: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  teamCount: 32,
  swissRounds: 7,
  knockoutSize: 8,
  strengthBias: false,
};

/* ─── Team Names ──────────────────────────────────────────────── */

const SWEDISH_TEAM_NAMES = [
  'Ölansen',
  'Kastarna',
  'Pongarna',
  'Trollbrygg',
  'Vikingarna',
  'Skumtopparna',
  'Guldölen',
  'Maltarna',
  'Humlebina',
  'Bryggarna',
  'Skålen',
  'Flaskpost',
  'Korkarna',
  'Tapparna',
  'Hantverkarna',
  'Skummaren',
  'Nubben',
  'Kapsylerna',
  'Pärlan',
  'Tunnbindarna',
  'Snapsen',
  'Blåsaren',
  'Studsarna',
  'Dropparna',
  'Klunken',
  'Svepen',
  'Fradgan',
  'Botten',
  'Krögarens',
  'Skvätten',
  'Plansen',
  'Bollarna',
];

/* ─── Team Generation ─────────────────────────────────────────── */

export function generateFakeTeams(count = 32): TournamentTeam[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `sim-${i + 1}`,
    name: i < SWEDISH_TEAM_NAMES.length ? SWEDISH_TEAM_NAMES[i] : `Lag ${i + 1}`,
    wins: 0,
    losses: 0,
  }));
}

/* ─── Skill Ratings ───────────────────────────────────────────── */

export function generateSkillRatings(
  teams: TournamentTeam[],
): Map<string, number> {
  const ratings = new Map<string, number>();
  teams.forEach((t, i) => {
    // Spread ratings evenly: best team ~100, worst ~1
    const rating = Math.round(((teams.length - i) / teams.length) * 99) + 1;
    ratings.set(t.id, rating);
  });
  return ratings;
}

/* ─── Match Simulation ────────────────────────────────────────── */

export function simulateMatchResult(pairing: Pairing): MatchResult {
  const winnerIsTeam1 = Math.random() < 0.5;
  const winnerScore = 6;
  const loserScore = Math.floor(Math.random() * 6);
  return {
    team1Id: pairing.team1Id,
    team2Id: pairing.team2Id,
    winnerId: winnerIsTeam1 ? pairing.team1Id : pairing.team2Id,
    loserId: winnerIsTeam1 ? pairing.team2Id : pairing.team1Id,
    scoreTeam1: winnerIsTeam1 ? winnerScore : loserScore,
    scoreTeam2: winnerIsTeam1 ? loserScore : winnerScore,
  };
}

export function simulateMatchResultWithBias(
  pairing: Pairing,
  skillRatings: Map<string, number>,
): MatchResult {
  const r1 = skillRatings.get(pairing.team1Id) ?? 50;
  const r2 = skillRatings.get(pairing.team2Id) ?? 50;
  const p1 = r1 / (r1 + r2);
  const winnerIsTeam1 = Math.random() < p1;
  const winnerScore = 6;
  const loserScore = Math.floor(Math.random() * 6);
  return {
    team1Id: pairing.team1Id,
    team2Id: pairing.team2Id,
    winnerId: winnerIsTeam1 ? pairing.team1Id : pairing.team2Id,
    loserId: winnerIsTeam1 ? pairing.team2Id : pairing.team1Id,
    scoreTeam1: winnerIsTeam1 ? winnerScore : loserScore,
    scoreTeam2: winnerIsTeam1 ? loserScore : winnerScore,
  };
}

/* ─── Variable Knockout Brackets ──────────────────────────────── */

export function generateSimBracketTop4(
  top4: TournamentTeam[],
): SimBracket {
  // SF: 1v4, 2v3
  const semifinals: BracketSlot[] = [
    { matchIndex: 0, team1Id: top4[0].id, team2Id: top4[3].id },
    { matchIndex: 1, team1Id: top4[1].id, team2Id: top4[2].id },
  ];
  const final: BracketSlot[] = [
    { matchIndex: 0, team1Id: null, team2Id: null },
  ];
  return {
    rounds: [semifinals, final],
    labels: ['Semifinal', 'Final'],
  };
}

export function generateSimBracketTop16(
  top16: TournamentTeam[],
): SimBracket {
  // Standard bracket seeding: 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15
  const seedOrder = [
    [0, 15], [7, 8], [4, 11], [3, 12],
    [2, 13], [5, 10], [6, 9], [1, 14],
  ];
  const r16: BracketSlot[] = seedOrder.map(([a, b], i) => ({
    matchIndex: i,
    team1Id: top16[a].id,
    team2Id: top16[b].id,
  }));
  const qf: BracketSlot[] = Array.from({ length: 4 }, (_, i) => ({
    matchIndex: i,
    team1Id: null,
    team2Id: null,
  }));
  const sf: BracketSlot[] = Array.from({ length: 2 }, (_, i) => ({
    matchIndex: i,
    team1Id: null,
    team2Id: null,
  }));
  const final: BracketSlot[] = [
    { matchIndex: 0, team1Id: null, team2Id: null },
  ];
  return {
    rounds: [r16, qf, sf, final],
    labels: ['Åttondel', 'Kvartsfinal', 'Semifinal', 'Final'],
  };
}

export function advanceSimKnockoutRound(
  bracket: SimBracket,
  results: MatchResult[],
  roundIndex: number,
): SimBracket {
  const next: SimBracket = {
    rounds: bracket.rounds.map((r) =>
      r.map((s) => ({ ...s })),
    ),
    labels: [...bracket.labels],
  };
  const currentRound = next.rounds[roundIndex];
  const nextRound = next.rounds[roundIndex + 1];
  if (!nextRound) return next;

  currentRound.forEach((slot, i) => {
    const result = results.find(
      (r) =>
        (r.team1Id === slot.team1Id && r.team2Id === slot.team2Id) ||
        (r.team1Id === slot.team2Id && r.team2Id === slot.team1Id),
    );
    if (!result) return;
    const nextSlotIndex = Math.floor(i / 2);
    const isTop = i % 2 === 0;
    if (isTop) {
      nextRound[nextSlotIndex].team1Id = result.winnerId;
    } else {
      nextRound[nextSlotIndex].team2Id = result.winnerId;
    }
  });

  return next;
}

/* ─── Verification Stats ──────────────────────────────────────── */

function pairingKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

export function computeVerificationStats(
  teams: TournamentTeam[],
  allResults: MatchResult[],
  roundHistory: { round: number; results: MatchResult[] }[],
  standings: { wins: number; opponentWins: number }[],
): VerificationStats {
  // Rematch counting
  const pairingCounts = new Map<string, number>();
  for (const r of allResults) {
    const key = pairingKey(r.team1Id, r.team2Id);
    pairingCounts.set(key, (pairingCounts.get(key) ?? 0) + 1);
  }
  let rematches = 0;
  for (const count of pairingCounts.values()) {
    if (count > 1) rematches += count - 1;
  }

  // Bye distribution
  const gamesPlayed = new Map<string, number>();
  for (const t of teams) gamesPlayed.set(t.id, 0);
  for (const r of allResults) {
    gamesPlayed.set(r.team1Id, (gamesPlayed.get(r.team1Id) ?? 0) + 1);
    gamesPlayed.set(r.team2Id, (gamesPlayed.get(r.team2Id) ?? 0) + 1);
  }
  const completedRounds = roundHistory.length;
  let maxByes = 0;
  for (const t of teams) {
    const played = gamesPlayed.get(t.id) ?? 0;
    const byes = completedRounds - played;
    if (byes > maxByes) maxByes = byes;
  }

  // Win distribution histogram
  const winCounts = new Map<number, number>();
  for (const t of teams) {
    const w = t.wins;
    winCounts.set(w, (winCounts.get(w) ?? 0) + 1);
  }
  const maxWins = Math.max(...teams.map((t) => t.wins), 0);
  const winDistribution: number[] = [];
  for (let i = 0; i <= maxWins; i++) {
    winDistribution.push(winCounts.get(i) ?? 0);
  }

  // Buchholz correlation (Pearson r between wins and opponent wins)
  const wins = standings.map((s) => s.wins);
  const bh = standings.map((s) => s.opponentWins);
  const buchholzCorrelation = pearsonR(wins, bh);

  // Average score differential per round
  const avgScoreDiffPerRound = roundHistory.map((rh) => {
    if (rh.results.length === 0) return 0;
    const totalDiff = rh.results.reduce(
      (sum, r) => sum + Math.abs(r.scoreTeam1 - r.scoreTeam2),
      0,
    );
    return Math.round((totalDiff / rh.results.length) * 10) / 10;
  });

  return {
    rematches,
    totalMatches: allResults.length,
    maxByes,
    winDistribution,
    buchholzCorrelation,
    avgScoreDiffPerRound,
  };
}

function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : Math.round((num / den) * 100) / 100;
}

/* ─── Batch Simulation ────────────────────────────────────────── */

export async function runBatchSimulation(
  config: SimConfig,
  count: number,
  onProgress: (done: number) => void,
  abortRef: { current: boolean },
): Promise<BatchResults> {
  // Lazy import to avoid circular deps
  const {
    generateSwissPairings,
    calculateRankings,
  } = await import('./tournament-engine');

  const rankSums = new Array(config.teamCount).fill(0);
  const topNCount = new Array(config.teamCount).fill(0);
  const championCount = new Map<number, number>();
  let simulationsRun = 0;

  const CHUNK = 10;
  for (let i = 0; i < count; i += CHUNK) {
    if (abortRef.current) break;
    const end = Math.min(i + CHUNK, count);
    for (let j = i; j < end; j++) {
      if (abortRef.current) break;
      // Run one full tournament
      let teams = generateFakeTeams(config.teamCount);
      const skillRatings = config.strengthBias
        ? generateSkillRatings(teams)
        : null;
      let allResults: MatchResult[] = [];

      // Swiss rounds
      for (let round = 1; round <= config.swissRounds; round++) {
        const rp = generateSwissPairings(teams, allResults, round);
        const results = rp.pairings.map((p: Pairing) =>
          skillRatings
            ? simulateMatchResultWithBias(p, skillRatings)
            : simulateMatchResult(p),
        );
        allResults = [...allResults, ...results];
        teams = teams.map((t) => {
          const won = results.filter(
            (r: MatchResult) => r.winnerId === t.id,
          ).length;
          const lost = results.filter(
            (r: MatchResult) => r.loserId === t.id,
          ).length;
          return { ...t, wins: t.wins + won, losses: t.losses + lost };
        });
        // Bye team gets a win
        if (rp.bye) {
          teams = teams.map((t) =>
            t.id === rp.bye ? { ...t, wins: t.wins + 1 } : t,
          );
        }
      }

      const standings = calculateRankings(teams, allResults);

      // Track stats by seed (original index)
      for (const s of standings) {
        const seedIndex = parseInt(s.id.replace('sim-', '')) - 1;
        rankSums[seedIndex] += s.rank;
        if (s.rank <= config.knockoutSize) {
          topNCount[seedIndex]++;
        }
      }

      // Simple knockout for champion tracking
      let knockoutTeams = standings
        .slice(0, config.knockoutSize)
        .map((s: { id: string; name: string; wins: number; losses: number }) => s.id);
      while (knockoutTeams.length > 1) {
        const nextRound: string[] = [];
        for (let k = 0; k < knockoutTeams.length; k += 2) {
          const p: Pairing = {
            team1Id: knockoutTeams[k],
            team2Id: knockoutTeams[k + 1],
          };
          const r = skillRatings
            ? simulateMatchResultWithBias(p, skillRatings)
            : simulateMatchResult(p);
          nextRound.push(r.winnerId);
        }
        knockoutTeams = nextRound;
      }
      const champSeed = parseInt(knockoutTeams[0].replace('sim-', ''));
      championCount.set(champSeed, (championCount.get(champSeed) ?? 0) + 1);
      simulationsRun++;
    }
    onProgress(Math.min(end, count));
    // Yield to UI
    await new Promise((r) => setTimeout(r, 0));
  }

  return {
    avgRankBySeed: rankSums.map((s) =>
      simulationsRun > 0 ? Math.round((s / simulationsRun) * 10) / 10 : 0,
    ),
    topNFrequency: topNCount.map((c) =>
      simulationsRun > 0 ? Math.round((c / simulationsRun) * 100) : 0,
    ),
    championDistribution: championCount,
    simulationsRun,
  };
}
