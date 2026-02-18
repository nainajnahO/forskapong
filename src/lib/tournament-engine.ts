/* ─── Types ───────────────────────────────────────────────────── */

export interface TournamentTeam {
  id: string;
  name: string;
  wins: number;
  losses: number;
}

export interface Pairing {
  team1Id: string;
  team2Id: string;
}

export interface MatchResult {
  team1Id: string;
  team2Id: string;
  winnerId: string;
  loserId: string;
  scoreTeam1: number;
  scoreTeam2: number;
}

export interface RoundPairings {
  round: number;
  pairings: Pairing[];
  bye: string | null;
}

export interface BracketSlot {
  matchIndex: number;
  team1Id: string | null;
  team2Id: string | null;
}

export interface KnockoutBracket {
  quarterfinals: BracketSlot[];
  semifinals: BracketSlot[];
  final: BracketSlot;
}

export interface TeamStanding {
  id: string;
  name: string;
  wins: number;
  losses: number;
  opponentWins: number;
  totalCupsHit: number;
  rank: number;
}

/* ─── Helpers ─────────────────────────────────────────────────── */

/** Fisher-Yates shuffle (mutates in place, returns same array). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build a set of "teamA-teamB" keys (sorted ids) from previous results. */
function buildPlayedSet(previousResults: MatchResult[]): Set<string> {
  const played = new Set<string>();
  for (const r of previousResults) {
    const key = [r.team1Id, r.team2Id].sort().join('-');
    played.add(key);
  }
  return played;
}

function pairingKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

/* ─── Swiss Pairing ───────────────────────────────────────────── */

export function generateSwissPairings(
  teams: TournamentTeam[],
  previousResults: MatchResult[],
  round: number,
): RoundPairings {
  const played = buildPlayedSet(previousResults);

  // Determine which teams already received a bye
  const byeTeams = new Set<string>();
  // A bye is implicitly tracked: if a team didn't appear in any pairing for a round
  // but we track it explicitly via the caller. For simplicity, we accept a separate
  // set, but here we'll look at the previous round pairings to find who got byes.
  // Actually, we need the caller to pass bye history — OR we can derive it:
  // teams that played fewer games than (round - 1) rounds so far got a bye.
  const gamesPlayed = new Map<string, number>();
  for (const t of teams) gamesPlayed.set(t.id, 0);
  for (const r of previousResults) {
    gamesPlayed.set(r.team1Id, (gamesPlayed.get(r.team1Id) ?? 0) + 1);
    gamesPlayed.set(r.team2Id, (gamesPlayed.get(r.team2Id) ?? 0) + 1);
  }
  const expectedGames = round - 1;
  for (const t of teams) {
    if ((gamesPlayed.get(t.id) ?? 0) < expectedGames) {
      byeTeams.add(t.id);
    }
  }

  // Handle bye for odd number of teams
  let bye: string | null = null;
  let activeTeams = [...teams];

  if (activeTeams.length % 2 !== 0) {
    // Pick lowest-wins team that hasn't had a bye, shuffle to randomize ties
    const candidates = shuffle(
      activeTeams
        .filter((t) => !byeTeams.has(t.id))
        .sort((a, b) => a.wins - b.wins),
    );
    // If all teams already had a bye, allow repeats
    const byeTeam =
      candidates.length > 0
        ? candidates[0]
        : shuffle([...activeTeams].sort((a, b) => a.wins - b.wins))[0];
    bye = byeTeam.id;
    activeTeams = activeTeams.filter((t) => t.id !== bye);
  }

  // Group by wins, shuffle within each group
  const groups = new Map<number, string[]>();
  for (const t of activeTeams) {
    const g = groups.get(t.wins) ?? [];
    g.push(t.id);
    groups.set(t.wins, g);
  }
  for (const g of groups.values()) shuffle(g);

  // Sort win counts descending
  const winCounts = [...groups.keys()].sort((a, b) => b - a);

  // Build an ordered pool: teams sorted by win group (highest first), shuffled within
  const pool: string[] = [];
  for (const w of winCounts) {
    pool.push(...groups.get(w)!);
  }

  // Backtracking pairing: find a complete matching with no rematches.
  // Pool is small (≤32) so backtracking is fast.
  const pairings: Pairing[] = [];

  function backtrack(remaining: string[]): boolean {
    if (remaining.length === 0) return true;
    if (remaining.length === 1) return false; // shouldn't happen with even count

    const first = remaining[0];
    const rest = remaining.slice(1);

    for (let i = 0; i < rest.length; i++) {
      const partner = rest[i];
      if (played.has(pairingKey(first, partner))) continue;

      pairings.push({ team1Id: first, team2Id: partner });
      const nextRemaining = [...rest.slice(0, i), ...rest.slice(i + 1)];
      if (backtrack(nextRemaining)) return true;
      pairings.pop();
    }

    return false;
  }

  // Try backtracking with no rematches first
  if (!backtrack([...pool])) {
    // Fallback: allow rematches (shouldn't happen with 32 teams / 7 rounds)
    pairings.length = 0;
    const fallbackPool = [...pool];
    while (fallbackPool.length >= 2) {
      const a = fallbackPool.shift()!;
      const b = fallbackPool.shift()!;
      pairings.push({ team1Id: a, team2Id: b });
    }
  }

  return { round, pairings, bye };
}

/* ─── Knockout Bracket ────────────────────────────────────────── */

export function generateKnockoutBracket(top8: TournamentTeam[]): KnockoutBracket {
  if (top8.length !== 8) {
    throw new Error(`Expected exactly 8 teams for knockout, got ${top8.length}`);
  }

  // Seeds are by array index: top8[0] = seed 1, top8[1] = seed 2, etc.
  const seed1 = top8[0].id;
  const seed2 = top8[1].id;

  // Seeds 3-4: randomized into QF2 top and QF3 top
  const seeds34 = shuffle([top8[2].id, top8[3].id]);

  // Seeds 5-8: randomized into the 4 remaining bottom slots
  const seeds58 = shuffle([top8[4].id, top8[5].id, top8[6].id, top8[7].id]);

  // Bracket layout:
  // QF1: seed1 vs seeds58[0]  → SF1
  // QF2: seeds34[0] vs seeds58[1] → SF1
  // QF3: seeds34[1] vs seeds58[2] → SF2
  // QF4: seed2 vs seeds58[3]  → SF2
  const quarterfinals: BracketSlot[] = [
    { matchIndex: 0, team1Id: seed1, team2Id: seeds58[0] },
    { matchIndex: 1, team1Id: seeds34[0], team2Id: seeds58[1] },
    { matchIndex: 2, team1Id: seeds34[1], team2Id: seeds58[2] },
    { matchIndex: 3, team1Id: seed2, team2Id: seeds58[3] },
  ];

  const semifinals: BracketSlot[] = [
    { matchIndex: 0, team1Id: null, team2Id: null },
    { matchIndex: 1, team1Id: null, team2Id: null },
  ];

  const final: BracketSlot = { matchIndex: 0, team1Id: null, team2Id: null };

  return { quarterfinals, semifinals, final };
}

export function advanceKnockoutRound(
  bracket: KnockoutBracket,
  results: MatchResult[],
  stage: 'quarterfinals' | 'semifinals' | 'final',
): KnockoutBracket {
  const next = structuredClone(bracket);

  if (stage === 'quarterfinals') {
    // QF results fill SF slots
    // QF0 winner → SF0.team1, QF1 winner → SF0.team2
    // QF2 winner → SF1.team1, QF3 winner → SF1.team2
    const qfWinners = next.quarterfinals.map((qf) => {
      const result = results.find(
        (r) =>
          (r.team1Id === qf.team1Id && r.team2Id === qf.team2Id) ||
          (r.team1Id === qf.team2Id && r.team2Id === qf.team1Id),
      );
      return result?.winnerId ?? null;
    });

    next.semifinals[0].team1Id = qfWinners[0];
    next.semifinals[0].team2Id = qfWinners[1];
    next.semifinals[1].team1Id = qfWinners[2];
    next.semifinals[1].team2Id = qfWinners[3];
  } else if (stage === 'semifinals') {
    const sfWinners = next.semifinals.map((sf) => {
      const result = results.find(
        (r) =>
          (r.team1Id === sf.team1Id && r.team2Id === sf.team2Id) ||
          (r.team1Id === sf.team2Id && r.team2Id === sf.team1Id),
      );
      return result?.winnerId ?? null;
    });

    next.final.team1Id = sfWinners[0];
    next.final.team2Id = sfWinners[1];
  }

  return next;
}

/* ─── Rankings ────────────────────────────────────────────────── */

export function calculateRankings(
  teams: TournamentTeam[],
  results: MatchResult[],
): TeamStanding[] {
  const teamStats = new Map<
    string,
    { wins: number; losses: number; cupsHit: number; opponents: string[] }
  >();

  for (const team of teams) {
    teamStats.set(team.id, { wins: 0, losses: 0, cupsHit: 0, opponents: [] });
  }

  for (const result of results) {
    const winner = teamStats.get(result.winnerId);
    const loser = teamStats.get(result.loserId);
    if (!winner || !loser) continue;

    winner.wins += 1;
    loser.losses += 1;

    winner.opponents.push(result.loserId);
    loser.opponents.push(result.winnerId);

    const t1 = teamStats.get(result.team1Id);
    const t2 = teamStats.get(result.team2Id);
    if (t1) t1.cupsHit += result.scoreTeam1;
    if (t2) t2.cupsHit += result.scoreTeam2;
  }

  // Calculate Buchholz (sum of opponents' wins)
  const standings: TeamStanding[] = teams.map((team) => {
    const stats = teamStats.get(team.id)!;
    const opponentWins = stats.opponents.reduce((sum, oppId) => {
      const oppStats = teamStats.get(oppId);
      return sum + (oppStats?.wins ?? 0);
    }, 0);

    return {
      id: team.id,
      name: team.name,
      wins: stats.wins,
      losses: stats.losses,
      opponentWins,
      totalCupsHit: stats.cupsHit,
      rank: 0,
    };
  });

  // Sort: 1) wins desc, 2) Buchholz desc, 3) total cups hit desc
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.opponentWins !== a.opponentWins) return b.opponentWins - a.opponentWins;
    return b.totalCupsHit - a.totalCupsHit;
  });

  standings.forEach((s, i) => {
    s.rank = i + 1;
  });

  return standings;
}
