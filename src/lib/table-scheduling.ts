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
