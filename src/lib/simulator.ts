import type { TournamentTeam, MatchResult, Pairing } from './tournament-engine';

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

export function generateFakeTeams(count = 32): TournamentTeam[] {
  return SWEDISH_TEAM_NAMES.slice(0, count).map((name, i) => ({
    id: `sim-${i + 1}`,
    name,
    wins: 0,
    losses: 0,
  }));
}

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
