import type { Match } from '@/lib/database.types';
import {
  generateKnockoutBracket,
  knockoutLabels,
  type TournamentTeam,
  type BracketSlot,
  type KnockoutBracket,
} from '@/lib/tournament-engine';
import { decideKnockoutHomeTeam, type OrientedPairing } from '@/lib/home-away';

/**
 * Shared knockout helpers for the *live* tournament (DB match rows ⇄ bracket).
 * Kept pure and separate from the engine so both the admin tab and the public
 * display build the bracket the same way, and so the wave/table → bracket-order
 * recovery these rely on is unit-tested rather than living inline in components.
 *
 * Convention: when a knockout round is generated its matches are inserted in
 * bracket order, and `assignTablesAndWaves` assigns waves/tables sequentially,
 * so sorting a round's rows by (wave, table) recovers that bracket order.
 */
function byWaveThenTable(a: Match, b: Match): number {
  return a.wave - b.wave || (a.table_number ?? 0) - (b.table_number ?? 0);
}

/**
 * Build the live bracket from the generated knockout match rows. Each round's
 * matches give its pairings (recovered in bracket order); rounds not yet
 * generated are left empty (TBD). Returns null until the first round is fully
 * generated. `knockoutSize` is a power of 2, so the bracket has log2(size) rounds.
 */
export function buildLiveBracket(
  knockoutMatches: Match[],
  knockoutStartRound: number,
  knockoutSize: number,
): KnockoutBracket | null {
  const firstRound = knockoutMatches.filter((m) => m.round === knockoutStartRound);
  if (firstRound.length !== knockoutSize / 2) return null;

  const numRounds = Math.log2(knockoutSize);
  const rounds: BracketSlot[][] = [];
  for (let r = 0; r < numRounds; r++) {
    const roundMatches = knockoutMatches
      .filter((m) => m.round === knockoutStartRound + r)
      .sort(byWaveThenTable);
    const slotCount = knockoutSize >> (r + 1); // matches in round r
    rounds.push(
      Array.from({ length: slotCount }, (_, i) => ({
        matchIndex: i,
        team1Id: roundMatches[i]?.team1_id ?? null,
        team2Id: roundMatches[i]?.team2_id ?? null,
      })),
    );
  }
  return { rounds, labels: knockoutLabels(knockoutSize) };
}

/**
 * Index of the next knockout round to generate: 0 for the first round, then one
 * past the highest already-generated round. Equals numRounds when the bracket is
 * complete.
 */
export function nextKnockoutRoundIndex(matches: Match[], knockoutStartRound: number): number {
  const generated = matches.filter((m) => m.round >= knockoutStartRound).map((m) => m.round);
  const lastGenerated = generated.length ? Math.max(...generated) : knockoutStartRound - 1;
  return lastGenerated - knockoutStartRound + 1;
}

/**
 * Seed the first knockout round: build the bracket from the top seeds and orient
 * each pairing (home/away) via knockout performance, falling back to standings.
 */
export function seedFirstKnockoutRound(
  seeds: TournamentTeam[],
  matches: Match[],
  knockoutStartRound: number,
  standingsRankMap: Map<string, number>,
): OrientedPairing[] {
  const bracket = generateKnockoutBracket(seeds);
  return bracket.rounds[0].map((slot) =>
    decideKnockoutHomeTeam(
      slot.team1Id!,
      slot.team2Id!,
      knockoutStartRound,
      matches,
      standingsRankMap,
      knockoutStartRound,
    ),
  );
}

/**
 * Pair the winners of a completed knockout round for the next round: recover
 * bracket order (wave, table), then pair adjacent winners (i with i+1), orienting
 * each. The caller passes the confirmed rows of the previous round.
 */
export function pairKnockoutWinners(
  prevRoundConfirmed: Match[],
  targetRound: number,
  knockoutStartRound: number,
  matches: Match[],
  standingsRankMap: Map<string, number>,
): OrientedPairing[] {
  const winners = [...prevRoundConfirmed]
    .sort(byWaveThenTable)
    .map((m) => m.winner_id)
    .filter(Boolean) as string[];

  const pairings: OrientedPairing[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    pairings.push(
      decideKnockoutHomeTeam(
        winners[i],
        winners[i + 1],
        targetRound,
        matches,
        standingsRankMap,
        knockoutStartRound,
      ),
    );
  }
  return pairings;
}
