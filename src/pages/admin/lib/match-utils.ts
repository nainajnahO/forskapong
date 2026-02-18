import type { Match, Team } from '@/lib/database.types';
import type { MatchResult, TournamentTeam } from '@/lib/tournament-engine';

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
 * Convert database Team rows into the engine's TournamentTeam format,
 * counting wins/losses from the provided results.
 */
export function teamsToEngine(teams: Team[], results: MatchResult[]): TournamentTeam[] {
  return teams.map((t) => {
    const wins = results.filter((r) => r.winnerId === t.id).length;
    const losses = results.filter((r) => r.loserId === t.id).length;
    return { id: t.id, name: t.name, wins, losses };
  });
}
