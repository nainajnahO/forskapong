import type { Match } from '@/lib/database.types';

export interface SimplePairing {
  team1Id: string;
  team2Id: string;
}

export interface OrientedPairing {
  homeTeamId: string;
  awayTeamId: string;
}

export function orientSwissPairings(
  rawPairings: SimplePairing[],
  swissMatches: Match[],
): OrientedPairing[] {
  const homeCounts = new Map<string, number>();
  const awayCounts = new Map<string, number>();

  for (const m of swissMatches) {
    homeCounts.set(m.team1_id, (homeCounts.get(m.team1_id) ?? 0) + 1);
    awayCounts.set(m.team2_id, (awayCounts.get(m.team2_id) ?? 0) + 1);
  }

  const getImbalance = (teamId: string, extraHome: number, extraAway: number): number => {
    const nextHome = (homeCounts.get(teamId) ?? 0) + extraHome;
    const nextAway = (awayCounts.get(teamId) ?? 0) + extraAway;
    return Math.abs(nextHome - nextAway);
  };

  return rawPairings.map((p) => {
    const a = p.team1Id;
    const b = p.team2Id;

    const aHomeScore = getImbalance(a, 1, 0) + getImbalance(b, 0, 1);
    const bHomeScore = getImbalance(a, 0, 1) + getImbalance(b, 1, 0);

    let homeTeamId = a;
    let awayTeamId = b;

    if (bHomeScore < aHomeScore) {
      homeTeamId = b;
      awayTeamId = a;
    } else if (bHomeScore === aHomeScore) {
      const aHomeCount = homeCounts.get(a) ?? 0;
      const bHomeCount = homeCounts.get(b) ?? 0;
      if (bHomeCount < aHomeCount) {
        homeTeamId = b;
        awayTeamId = a;
      }
    }

    homeCounts.set(homeTeamId, (homeCounts.get(homeTeamId) ?? 0) + 1);
    awayCounts.set(awayTeamId, (awayCounts.get(awayTeamId) ?? 0) + 1);
    return { homeTeamId, awayTeamId };
  });
}

function getTeamCupDiff(match: Match, teamId: string): number | null {
  if (match.score_team1 == null || match.score_team2 == null) return null;
  if (match.team1_id === teamId) return match.score_team1 - match.score_team2;
  if (match.team2_id === teamId) return match.score_team2 - match.score_team1;
  return null;
}

function getLatestKnockoutPerformance(
  matchesForTeam: Match[],
): { round: number; cupDiff: number } | null {
  const completed = matchesForTeam.filter((m) => m.winner_id !== null);
  if (completed.length === 0) return null;

  const latest = [...completed].sort((a, b) => b.round - a.round)[0];
  const winnerId = latest.winner_id;
  if (!winnerId) return null;
  const cupDiff = getTeamCupDiff(latest, winnerId);
  if (cupDiff == null) return null;
  return { round: latest.round, cupDiff };
}

export function decideKnockoutHomeTeam(
  teamAId: string,
  teamBId: string,
  targetRound: number,
  allMatches: Match[],
  standingsRankMap: Map<string, number>,
): OrientedPairing {
  const priorKnockout = allMatches.filter(
    (m) =>
      m.round >= 8 &&
      m.round < targetRound &&
      (m.team1_id === teamAId ||
        m.team2_id === teamAId ||
        m.team1_id === teamBId ||
        m.team2_id === teamBId),
  );

  const perfA = getLatestKnockoutPerformance(
    priorKnockout.filter((m) => m.team1_id === teamAId || m.team2_id === teamAId),
  );
  const perfB = getLatestKnockoutPerformance(
    priorKnockout.filter((m) => m.team1_id === teamBId || m.team2_id === teamBId),
  );

  if (perfA && perfB) {
    if (perfA.round > perfB.round) return { homeTeamId: teamAId, awayTeamId: teamBId };
    if (perfB.round > perfA.round) return { homeTeamId: teamBId, awayTeamId: teamAId };
    if (perfA.cupDiff > perfB.cupDiff) return { homeTeamId: teamAId, awayTeamId: teamBId };
    if (perfB.cupDiff > perfA.cupDiff) return { homeTeamId: teamBId, awayTeamId: teamAId };
  }

  const rankA = standingsRankMap.get(teamAId) ?? Number.POSITIVE_INFINITY;
  const rankB = standingsRankMap.get(teamBId) ?? Number.POSITIVE_INFINITY;
  if (rankA <= rankB) return { homeTeamId: teamAId, awayTeamId: teamBId };
  return { homeTeamId: teamBId, awayTeamId: teamAId };
}

export function canHomeTeamReport(match: Match, teamId: string): boolean {
  return match.team1_id === teamId && match.winner_id === null;
}

export function canAwayTeamConfirm(match: Match, teamId: string): boolean {
  return (
    match.team2_id === teamId &&
    match.winner_id !== null &&
    !match.confirmed &&
    match.reported_by !== null &&
    match.reported_by === match.team1_id
  );
}
