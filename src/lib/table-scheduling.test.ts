import { describe, expect, it } from 'vitest';
import {
  assignTablesAndWaves,
  getTableSlot,
  getWaveCount,
  normalizeTableCount,
  waveStartTime,
} from './table-scheduling';

describe('table scheduling', () => {
  it('normalizes invalid table counts to 1', () => {
    expect(normalizeTableCount(0)).toBe(1);
    expect(normalizeTableCount(-4)).toBe(1);
    expect(normalizeTableCount(Number.NaN)).toBe(1);
    expect(normalizeTableCount(7.9)).toBe(7);
  });

  it('calculates wave counts for less/equal/greater than table count', () => {
    expect(getWaveCount(0, 8)).toBe(0);
    expect(getWaveCount(6, 8)).toBe(1);
    expect(getWaveCount(8, 8)).toBe(1);
    expect(getWaveCount(16, 8)).toBe(2);
    expect(getWaveCount(17, 8)).toBe(3);
  });

  it('assigns wave and table slots deterministically', () => {
    expect(getTableSlot(0, 8)).toEqual({ wave: 1, tableNumber: 1 });
    expect(getTableSlot(7, 8)).toEqual({ wave: 1, tableNumber: 8 });
    expect(getTableSlot(8, 8)).toEqual({ wave: 2, tableNumber: 1 });
    expect(getTableSlot(15, 8)).toEqual({ wave: 2, tableNumber: 8 });
  });

  it('never duplicates table numbers within the same wave', () => {
    const scheduled = assignTablesAndWaves(
      Array.from({ length: 16 }, (_, i) => ({ id: i + 1 })),
      6,
    );

    const usedByWave = new Map<number, Set<number>>();
    for (const match of scheduled) {
      const waveSet = usedByWave.get(match.wave) ?? new Set<number>();
      expect(waveSet.has(match.tableNumber)).toBe(false);
      waveSet.add(match.tableNumber);
      usedByWave.set(match.wave, waveSet);
    }
  });
});

describe('waveStartTime', () => {
  it('returns the round start unchanged for the first wave', () => {
    expect(waveStartTime('17:00', 1, 10)).toBe('17:00');
  });

  it('offsets later waves by (wave - 1) match lengths', () => {
    expect(waveStartTime('17:00', 2, 10)).toBe('17:10');
    expect(waveStartTime('17:00', 3, 10)).toBe('17:20');
    expect(waveStartTime('17:00', 4, 7)).toBe('17:21');
  });

  it('carries minutes into the next hour', () => {
    expect(waveStartTime('17:50', 2, 15)).toBe('18:05');
  });

  it('zero-pads hours and minutes', () => {
    expect(waveStartTime('09:05', 2, 5)).toBe('09:10');
  });

  it('wraps around midnight', () => {
    expect(waveStartTime('23:30', 4, 15)).toBe('00:15');
  });
});
