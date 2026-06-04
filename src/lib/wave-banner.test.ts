import { describe, it, expect } from 'vitest';
import { deriveWaveBannerState, type WaveBannerMatch } from './wave-banner';

const unreported: WaveBannerMatch = {
  confirmed: false,
  result: null,
  needsConfirmation: false,
  wave: 2,
};

describe('deriveWaveBannerState', () => {
  it('hides the banner when the round has a single wave', () => {
    expect(deriveWaveBannerState(unreported, { status: 'swiss', waveCount: 1, activeWave: 1 })).toBe(
      null,
    );
  });

  it('hides the banner when the tournament is not live', () => {
    for (const status of ['not_started', 'finished']) {
      expect(
        deriveWaveBannerState(unreported, { status, waveCount: 3, activeWave: 1 }),
      ).toBe(null);
    }
  });

  it('hides the banner when the team has no match in the round (bye)', () => {
    expect(deriveWaveBannerState(null, { status: 'swiss', waveCount: 3, activeWave: 1 })).toBe(null);
  });

  it("shows 'turn' when the team's wave is the active wave", () => {
    expect(
      deriveWaveBannerState(
        { ...unreported, wave: 2 },
        { status: 'swiss', waveCount: 3, activeWave: 2 },
      ),
    ).toBe('turn');
  });

  it("shows 'wait' when an earlier wave is still being played", () => {
    expect(
      deriveWaveBannerState(
        { ...unreported, wave: 2 },
        { status: 'swiss', waveCount: 3, activeWave: 1 },
      ),
    ).toBe('wait');
  });

  it("shows 'turn' for the away team owing a confirmation, even while an earlier wave is open", () => {
    // Away team: home reported (result set, winner/loser known), needs this team to confirm.
    // Their action isn't wave-gated — confirming is always "their turn".
    const awaitingMyConfirm: WaveBannerMatch = {
      confirmed: false,
      result: 'win',
      needsConfirmation: true,
      wave: 2,
    };
    expect(
      deriveWaveBannerState(awaitingMyConfirm, { status: 'swiss', waveCount: 3, activeWave: 1 }),
    ).toBe('turn');
  });

  it("shows 'done' for the home reporter awaiting the opponent's confirmation", () => {
    const reportedNotConfirmed: WaveBannerMatch = {
      confirmed: false,
      result: 'win',
      needsConfirmation: false,
      wave: 1,
    };
    expect(
      deriveWaveBannerState(reportedNotConfirmed, { status: 'swiss', waveCount: 3, activeWave: 1 }),
    ).toBe('done');
  });

  it("shows 'done' once the match is confirmed", () => {
    const confirmed: WaveBannerMatch = {
      confirmed: true,
      result: 'loss',
      needsConfirmation: false,
      wave: 2,
    };
    expect(
      deriveWaveBannerState(confirmed, { status: 'swiss', waveCount: 3, activeWave: 3 }),
    ).toBe('done');
  });

  it("shows 'turn' for an away team in the active wave before the home team has reported", () => {
    // result null, can't report, no confirmation owed yet — still their turn to go play.
    expect(
      deriveWaveBannerState(
        { confirmed: false, result: null, needsConfirmation: false, wave: 1 },
        { status: 'knockout', waveCount: 2, activeWave: 1 },
      ),
    ).toBe('turn');
  });
});
