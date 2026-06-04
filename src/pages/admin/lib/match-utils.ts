import type { Match, Team } from '@/lib/database.types';
import {
  calculateRankings,
  countByesPerTeam,
  deriveByes,
  type MatchResult,
  type TeamStanding,
  type TournamentTeam,
} from '@/lib/tournament-engine';

/**
 * Convert a database Match row into the engine's MatchResult format.
 * Returns null if the match has no result yet.
 */
export function dbMatchToResult(m: Match): MatchResult | null {
  if (!m.winner_id || !m.loser_id) return null;
  return {
    team1Id: m.team1_id,
    team2Id: m.team2_id,
    winnerId: m.winner_id,
    loserId: m.loser_id,
    scoreTeam1: m.score_team1 ?? 0,
    scoreTeam2: m.score_team2 ?? 0,
  };
}

/**
 * Convert database Team rows into the engine's TournamentTeam format, counting
 * wins/losses from the provided results. A bye counts as a win (issue #26), so
 * pass the per-team bye count when the win total must reflect byes — e.g. when
 * seeding the next Swiss round so the bye team is grouped correctly.
 */
export function teamsToEngine(
  teams: Team[],
  results: MatchResult[],
  byes: ReadonlyMap<string, number> = new Map(),
): TournamentTeam[] {
  return teams.map((t) => {
    const wins = results.filter((r) => r.winnerId === t.id).length + (byes.get(t.id) ?? 0);
    const losses = results.filter((r) => r.loserId === t.id).length;
    return { id: t.id, name: t.name, wins, losses };
  });
}

/** Per-round bye team derived from raw match rows (issue #26). */
export function byesByRound(teams: Team[], matches: Match[]): Map<number, string> {
  return deriveByes(
    teams.map((t) => t.id),
    matches.map((m) => ({ round: m.round, team1Id: m.team1_id, team2Id: m.team2_id })),
  );
}

/**
 * Full standings from raw DB rows: derives Swiss byes, credits each as a win plus
 * an average-margin cup-diff bonus (issue #26), and ranks. The single place app
 * code should compute standings, so every view (admin, scoreboard, display) agrees.
 */
export function standingsFromMatches(teams: Team[], matches: Match[]): TeamStanding[] {
  const results = matches.map(dbMatchToResult).filter(Boolean) as MatchResult[];
  const byeCount = countByesPerTeam(byesByRound(teams, matches));
  return calculateRankings(teamsToEngine(teams, results), results, byeCount);
}
