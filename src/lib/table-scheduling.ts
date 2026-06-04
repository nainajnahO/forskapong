export interface TableSlot {
  wave: number;
  tableNumber: number;
}

export function normalizeTableCount(tableCount: number): number {
  if (!Number.isFinite(tableCount)) return 1;
  return Math.max(1, Math.floor(tableCount));
}

export function getWaveCount(matchCount: number, tableCount: number): number {
  if (matchCount <= 0) return 0;
  const safeTableCount = normalizeTableCount(tableCount);
  return Math.ceil(matchCount / safeTableCount);
}

export function getTableSlot(index: number, tableCount: number): TableSlot {
  const safeTableCount = normalizeTableCount(tableCount);
  const safeIndex = Math.max(0, index);
  return {
    wave: Math.floor(safeIndex / safeTableCount) + 1,
    tableNumber: (safeIndex % safeTableCount) + 1,
  };
}

export function assignTablesAndWaves<T>(items: T[], tableCount: number): Array<T & TableSlot> {
  return items.map((item, index) => ({
    ...item,
    ...getTableSlot(index, tableCount),
  }));
}

/**
 * Planned wall-clock start of a wave, as an "HH:MM" string.
 *
 * Waves play one after another, so wave N's planned start is the round start plus
 * (N-1) match lengths. JS has no built-in for adding minutes to a bare "HH:MM"
 * time-of-day without constructing a Date (which drags in a calendar date and
 * timezone we don't have here), so we do the minutes arithmetic directly and wrap
 * at 24h. The result is a *plan*: a wave really starts once the previous one is
 * confirmed, so callers should present it as approximate ("ca 17:10").
 */
export function waveStartTime(roundStart: string, wave: number, durationMinutes: number): string {
  const [hours, minutes] = roundStart.split(':').map(Number);
  const total = hours * 60 + minutes + Math.max(0, wave - 1) * durationMinutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
  const mm = String(wrapped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
