import { SCHEDULE_PHASES } from '@/lib/constants';
import type { EnrichedEvent } from './types';

// ── Time helpers ──────────────────────────────────────────────────
// Event timeline runs 17:00 → 02:00 (next day). Times after midnight (e.g. "01:30")
// are detected as < START_HOUR and shifted by 24h so they sort after the late-night klubb.
const START_HOUR = 17;

export function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  let hour = parseInt(match[1]);
  if (hour < START_HOUR) hour += 24;
  return (hour - START_HOUR) * 60 + parseInt(match[2]);
}

export function formatMinutesToClock(minutes: number): string {
  const h = (START_HOUR + Math.floor(minutes / 60)) % 24;
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ── Enriched event data ──────────────────────────────────────────
export const EVENTS: EnrichedEvent[] = SCHEDULE_PHASES.flatMap((phase) =>
  phase.events.map((ev) => {
    const e = ev as typeof ev & {
      italic?: boolean;
      bold?: boolean;
      speakers?: readonly { readonly name: string; readonly title: string }[];
      type?: 'event' | 'login';
    };
    return {
      time: e.time,
      title: e.title,
      description: e.description,
      italic: e.italic,
      bold: e.bold,
      speakers: e.speakers,
      type: e.type,
      phase: phase.name,
      phaseStartMinute: parseTimeToMinutes(phase.startTime),
      startMinute: parseTimeToMinutes(ev.time),
    };
  }),
);

// Phase list for the spine badges
export const PHASES = SCHEDULE_PHASES.map((p) => ({
  name: p.name,
  startMinute: parseTimeToMinutes(p.startTime),
}));

export const TOTAL_MINUTES = 210;

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
