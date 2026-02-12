import { SCHEDULE_PHASES } from '@/lib/constants';
import type { EnrichedEvent } from './types';

// ── Time helpers ──────────────────────────────────────────────────
export function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  return (parseInt(match[1]) - 18) * 60 + parseInt(match[2]);
}

export function formatMinutesToClock(minutes: number): string {
  const h = 18 + Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ── Enriched event data ──────────────────────────────────────────
export const EVENTS: EnrichedEvent[] = SCHEDULE_PHASES.flatMap((phase) =>
  phase.events.map((ev) => ({
    time: ev.time,
    title: ev.title,
    description: ev.description,
    italic: 'italic' in ev ? ev.italic : undefined,
    bold: 'bold' in ev ? ev.bold : undefined,
    speakers: 'speakers' in ev ? ev.speakers : undefined,
    phase: phase.name,
    phaseStartMinute: parseTimeToMinutes(phase.startTime),
    startMinute: parseTimeToMinutes(ev.time),
  })),
);

// Phase list for the spine badges
export const PHASES = SCHEDULE_PHASES.map((p) => ({
  name: p.name,
  startMinute: parseTimeToMinutes(p.startTime),
}));

export const TOTAL_MINUTES = 270;

// ── Scroll constants ─────────────────────────────────────────────
export const SCROLL_PAGES = 5;
export const SCROLL_MARGIN = 0.04;
export const BOTTOM_PADDING = 48;
const USABLE = 1 - 2 * SCROLL_MARGIN;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function progressToMinute(p: number): number {
  return Math.round(clamp((p - SCROLL_MARGIN) / USABLE, 0, 1) * TOTAL_MINUTES);
}
