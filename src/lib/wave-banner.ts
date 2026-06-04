/**
 * Wave status banner state for the team dashboard.
 *
 * A round is split into waves ("spelpass") when there aren't enough tables for every
 * match at once. There is no current-wave column; the active wave is derived as the
 * lowest wave still holding an unconfirmed match (earlier waves are confirmed before
 * later ones play). This answers, for one team: am I up now, waiting, or done?
 *
 * Pure + tested in isolation (see wave-banner.test.ts); the Dashboard only renders it.
 */

export interface WaveBannerMatch {
  confirmed: boolean;
  result: 'win' | 'loss' | null;
  needsConfirmation: boolean;
  wave: number;
}

export interface WaveBannerContext {
  status: string; // tournament status; only 'swiss' / 'knockout' are live
  waveCount: number; // waves in the current round
  activeWave: number | null; // lowest wave with an unconfirmed match; null once all confirmed
}

export type WaveBannerState = 'turn' | 'wait' | 'done';

export function deriveWaveBannerState(
  match: WaveBannerMatch | null,
  ctx: WaveBannerContext,
): WaveBannerState | null {
  const liveRound = ctx.status === 'swiss' || ctx.status === 'knockout';
  // Only meaningful when the live round actually spans multiple waves and this team
  // has a match in it; single-wave rounds (and byes) need no turn/wait signal.
  if (!liveRound || ctx.waveCount <= 1 || !match) return null;

  // Played: confirmed, or reported and now awaiting the opponent's confirmation.
  if (match.confirmed || (match.result !== null && !match.needsConfirmation)) return 'done';

  // Your wave is the one on the tables (lowest unconfirmed), or you owe a confirmation.
  if (match.needsConfirmation || ctx.activeWave === null || match.wave <= ctx.activeWave) {
    return 'turn';
  }

  // An earlier wave is still being played — wait for it to finish.
  return 'wait';
}
