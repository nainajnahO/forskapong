import { describe, expect, it } from 'vitest';
import type { Match } from '@/lib/database.types';
import {
  canAwayTeamConfirm,
  canHomeTeamReport,
  decideKnockoutHomeTeam,
  orientSwissPairings,
} from '@/lib/home-away';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    round: overrides.round ?? 1,
    wave: overrides.wave ?? 1,
    team1_id: overrides.team1_id ?? 't1',
    team2_id: overrides.team2_id ?? 't2',
    table_number: overrides.table_number ?? 1,
    scheduled_time: overrides.scheduled_time ?? null,
    winner_id: overrides.winner_id ?? null,
    loser_id: overrides.loser_id ?? null,
    score_team1: overrides.score_team1 ?? null,
    score_team2: overrides.score_team2 ?? null,
    reported_by: overrides.reported_by ?? null,
    confirmed: overrides.confirmed ?? false,
    confirmed_by: overrides.confirmed_by ?? null,
    created_at: overrides.created_at ?? new Date().toISOString(),
  };
}

describe('orientSwissPairings', () => {
  it('balances home/away assignment using previous swiss history', () => {
    const history: Match[] = [
      makeMatch({ team1_id: 'A', team2_id: 'X' }),
      makeMatch({ team1_id: 'A', team2_id: 'Y' }),
      makeMatch({ team1_id: 'Z', team2_id: 'B' }),
      makeMatch({ team1_id: 'W', team2_id: 'B' }),
    ];

    const oriented = orientSwissPairings([{ team1Id: 'A', team2Id: 'B' }], history);
    expect(oriented[0]).toEqual({ homeTeamId: 'B', awayTeamId: 'A' });
  });

  it('keeps all original pairings while only changing orientation', () => {
    const raw = [
      { team1Id: 'A', team2Id: 'B' },
      { team1Id: 'C', team2Id: 'D' },
    ];
    const oriented = orientSwissPairings(raw, []);

    expect(oriented).toHaveLength(2);
    for (let i = 0; i < raw.length; i++) {
      const before = new Set([raw[i].team1Id, raw[i].team2Id]);
      const after = new Set([oriented[i].homeTeamId, oriented[i].awayTeamId]);
      expect(after).toEqual(before);
    }
  });
});

describe('decideKnockoutHomeTeam', () => {
  it('uses standings rank for first knockout match after group stage', () => {
    const standings = new Map<string, number>([
      ['A', 2],
      ['B', 5],
    ]);

    const decision = decideKnockoutHomeTeam('A', 'B', 8, [], standings, 8);
    expect(decision).toEqual({ homeTeamId: 'A', awayTeamId: 'B' });
  });

  it('uses latest knockout cup difference in later knockout rounds', () => {
    const standings = new Map<string, number>([
      ['A', 5],
      ['B', 1],
    ]);
    const matches: Match[] = [
      makeMatch({
        round: 8,
        team1_id: 'A',
        team2_id: 'X',
        winner_id: 'A',
        loser_id: 'X',
        score_team1: 6,
        score_team2: 4, // A diff +2
      }),
      makeMatch({
        round: 8,
        team1_id: 'Y',
        team2_id: 'B',
        winner_id: 'B',
        loser_id: 'Y',
        score_team1: 5,
        score_team2: 6, // B diff +1
      }),
    ];

    const decision = decideKnockoutHomeTeam('A', 'B', 9, matches, standings, 8);
    expect(decision).toEqual({ homeTeamId: 'A', awayTeamId: 'B' });
  });

  it('falls back to standings when knockout performance is tied', () => {
    const standings = new Map<string, number>([
      ['A', 1],
      ['B', 3],
    ]);
    const matches: Match[] = [
      makeMatch({
        round: 8,
        team1_id: 'A',
        team2_id: 'X',
        winner_id: 'A',
        loser_id: 'X',
        score_team1: 6,
        score_team2: 5, // A diff +1
      }),
      makeMatch({
        round: 8,
        team1_id: 'B',
        team2_id: 'Y',
        winner_id: 'B',
        loser_id: 'Y',
        score_team1: 6,
        score_team2: 5, // B diff +1
      }),
    ];

    const decision = decideKnockoutHomeTeam('A', 'B', 9, matches, standings, 8);
    expect(decision).toEqual({ homeTeamId: 'A', awayTeamId: 'B' });
  });

  it('respects a derived knockout start round so Swiss matches are not read as prior knockout', () => {
    // 5-round event → knockout starts at round 6. A round-5 Swiss win must not be
    // mistaken for a prior knockout result when orienting the round-7 match.
    const standings = new Map<string, number>([
      ['A', 4],
      ['B', 1],
    ]);
    const matches: Match[] = [
      makeMatch({
        round: 5, // Swiss, below the derived start (6) — must be ignored
        team1_id: 'A',
        team2_id: 'X',
        winner_id: 'A',
        loser_id: 'X',
        score_team1: 6,
        score_team2: 0, // huge diff, but Swiss → ignored
      }),
    ];

    // No qualifying prior knockout, so it falls back to standings: B (rank 1) is home.
    const decision = decideKnockoutHomeTeam('A', 'B', 7, matches, standings, 6);
    expect(decision).toEqual({ homeTeamId: 'B', awayTeamId: 'A' });
  });
});

describe('home-away permissions', () => {
  it('allows reporting only for home team on unplayed match', () => {
    const match = makeMatch({ team1_id: 'HOME', team2_id: 'AWAY', winner_id: null });
    expect(canHomeTeamReport(match, 'HOME')).toBe(true);
    expect(canHomeTeamReport(match, 'AWAY')).toBe(false);
  });

  it('blocks reporting after result exists', () => {
    const match = makeMatch({
      team1_id: 'HOME',
      team2_id: 'AWAY',
      winner_id: 'HOME',
      loser_id: 'AWAY',
    });
    expect(canHomeTeamReport(match, 'HOME')).toBe(false);
  });

  it('allows confirmation only for away team after home reported', () => {
    const match = makeMatch({
      team1_id: 'HOME',
      team2_id: 'AWAY',
      winner_id: 'HOME',
      loser_id: 'AWAY',
      score_team1: 6,
      score_team2: 4,
      reported_by: 'HOME',
      confirmed: false,
    });

    expect(canAwayTeamConfirm(match, 'AWAY')).toBe(true);
    expect(canAwayTeamConfirm(match, 'HOME')).toBe(false);
  });

  it('blocks confirmation when constraints are not met', () => {
    const base = makeMatch({
      team1_id: 'HOME',
      team2_id: 'AWAY',
      winner_id: 'HOME',
      loser_id: 'AWAY',
      reported_by: 'HOME',
    });

    expect(canAwayTeamConfirm({ ...base, confirmed: true }, 'AWAY')).toBe(false);
    expect(canAwayTeamConfirm({ ...base, reported_by: 'AWAY' }, 'AWAY')).toBe(false);
    expect(canAwayTeamConfirm({ ...base, winner_id: null }, 'AWAY')).toBe(false);
  });
});
