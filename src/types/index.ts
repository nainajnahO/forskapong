// Schedule Types
export interface Speaker {
  readonly name: string;
  readonly title: string;
}

export interface ScheduleEvent {
  readonly time: string;
  readonly title: string;
  readonly description: string;
  readonly italic?: boolean;
  readonly bold?: boolean;
  readonly speakers?: readonly Speaker[];
}

export interface SchedulePhase {
  readonly name: string;
  readonly startTime: string;
  readonly events: readonly ScheduleEvent[];
}

// Navigation Types
export interface NavLink {
  label: string;
  href: string;
}

// Attendee Types
export interface AttendeeCategory {
  name: string;
  highlighted: boolean;
}

// 3D Showcase Types
export interface CameraWaypoint {
  readonly progress: number;
  readonly position: readonly [number, number, number];
  readonly lookAt: readonly [number, number, number];
}

export interface ShowcaseAnnotation {
  readonly text: string;
  readonly subtext?: string;
  readonly position: readonly [string, string]; // [top CSS, left CSS]
  readonly scrollRange: readonly [number, number];
}
