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
