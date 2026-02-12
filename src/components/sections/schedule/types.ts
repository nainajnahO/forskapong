export interface EnrichedEvent {
  time: string;
  title: string;
  description: string;
  italic?: boolean;
  bold?: boolean;
  speakers?: readonly { readonly name: string; readonly title: string }[];
  phase: string;
  phaseStartMinute: number;
  startMinute: number;
}
