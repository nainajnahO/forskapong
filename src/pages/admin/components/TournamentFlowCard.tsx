import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import {
  Users,
  Play,
  Shuffle,
  Clock,
  ChevronRight,
  Swords,
  Trophy,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { Match, Tournament } from '@/lib/database.types';
import type { AdminTab } from '@/contexts/AdminTabContextDef';
import { getKnockoutStartRound } from '@/lib/constants';
import { knockoutLabels } from '@/lib/tournament-engine';

interface Props {
  tournament: Tournament | null;
  teams: { length: number };
  roundsMap: Map<number, Match[]>;
  generating: boolean;
  roundTime: string;
  roundCount: number;
  tableCount: number;
  knockoutSize: number;
  schedulePreview: { matchCount: number; waveCount: number } | null;
  onRoundTimeChange: (v: string) => void;
  onRoundCountChange: (v: number) => void;
  onTableCountChange: (v: number) => void;
  onKnockoutSizeChange: (v: number) => void;
  onStartTournament: () => void;
  onGeneratePairings: () => void;
  onAdvanceRound: () => void;
  onStartKnockout: () => void;
  onGenerateNextKnockoutRound: () => void;
  knockoutBlockedByTie: boolean;
  onFinishTournament: () => void;
  onTabChange: (tab: AdminTab) => void;
  championName: string | null;
}

type FlowState =
  | 'no_teams'
  | 'not_started'
  | 'swiss_generate'
  | 'swiss_in_progress'
  | 'swiss_round_done'
  | 'swiss_done'
  | 'knockout_generate'
  | 'knockout_round_in_progress'
  | 'knockout_round_done'
  | 'knockout_complete'
  | 'finished';

/** Where the knockout bracket currently stands, derived from the match rows. */
interface KnockoutInfo {
  size: number;
  startRound: number;
  numRounds: number; // log2(size)
  labels: string[]; // first round → final
  currentIdx: number; // highest generated round index, -1 if none generated yet
  currentMatches: Match[];
  currentConfirmed: boolean; // current round generated AND all its matches confirmed
}

function summarizeKnockout(
  roundsMap: Map<number, Match[]>,
  totalRounds: number,
  knockoutSize: number,
): KnockoutInfo {
  const startRound = getKnockoutStartRound(totalRounds);
  const numRounds = Math.log2(knockoutSize);
  let currentIdx = -1;
  for (let r = 0; r < numRounds; r++) {
    if ((roundsMap.get(startRound + r) ?? []).length > 0) currentIdx = r;
  }
  const currentMatches = currentIdx >= 0 ? (roundsMap.get(startRound + currentIdx) ?? []) : [];
  const expected = currentIdx >= 0 ? knockoutSize >> (currentIdx + 1) : 0;
  const currentConfirmed =
    currentIdx >= 0 &&
    currentMatches.length === expected &&
    currentMatches.every((m) => m.confirmed);
  return { size: knockoutSize, startRound, numRounds, labels: knockoutLabels(knockoutSize), currentIdx, currentMatches, currentConfirmed };
}

function deriveFlowState(
  tournament: Tournament | null,
  teamsCount: number,
  roundsMap: Map<number, Match[]>,
  totalRounds: number,
  ko: KnockoutInfo,
): FlowState {
  const status = tournament?.status ?? 'not_started';
  const currentRound = tournament?.current_round ?? 0;

  if (teamsCount === 0) return 'no_teams';
  if (status === 'not_started') return 'not_started';
  if (status === 'finished') return 'finished';

  if (status === 'swiss') {
    const roundMatches = roundsMap.get(currentRound);
    if (!roundMatches || roundMatches.length === 0) return 'swiss_generate';

    const allConfirmed = roundMatches.every((m) => m.confirmed);
    if (!allConfirmed) return 'swiss_in_progress';

    if (currentRound >= totalRounds) return 'swiss_done';
    return 'swiss_round_done';
  }

  if (status === 'knockout') {
    if (ko.currentIdx === -1) return 'knockout_generate';
    if (!ko.currentConfirmed) return 'knockout_round_in_progress';
    if (ko.currentIdx >= ko.numRounds - 1) return 'knockout_complete';
    return 'knockout_round_done';
  }

  return 'not_started';
}

function getProgress(roundMatches: Match[]): { confirmed: number; total: number } {
  const total = roundMatches.length;
  const confirmed = roundMatches.filter((m) => m.confirmed).length;
  return { confirmed, total };
}

export default function TournamentFlowCard(props: Props) {
  const {
    tournament,
    teams,
    roundsMap,
    generating,
    roundTime,
    roundCount,
    tableCount,
    knockoutSize,
    schedulePreview,
    onRoundTimeChange,
    onRoundCountChange,
    onTableCountChange,
    onKnockoutSizeChange,
    onStartTournament,
    onGeneratePairings,
    onAdvanceRound,
    onStartKnockout,
    onGenerateNextKnockoutRound,
    knockoutBlockedByTie,
    onFinishTournament,
    onTabChange,
    championName,
  } = props;

  const totalRounds = tournament?.total_rounds ?? roundCount;
  const ko = summarizeKnockout(roundsMap, totalRounds, knockoutSize);
  const flowState = deriveFlowState(tournament, teams.length, roundsMap, totalRounds, ko);
  const currentRound = tournament?.current_round ?? 0;
  // The knockout floats to total_rounds + 1, so the old "≤ 7" cap is gone. The only
  // real ceiling is the number of distinct opponents: at most teams.length - 1 Swiss
  // rounds before rematches are unavoidable.
  const maxRounds = Math.max(1, teams.length - 1);
  // Selectable knockout sizes: powers of 2 up to the team count (no first-round byes).
  const knockoutSizeOptions: number[] = [];
  for (let n = 2; n <= teams.length; n *= 2) knockoutSizeOptions.push(n);

  const config = getCardConfig(flowState, currentRound, roundsMap, championName, totalRounds, ko);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border p-5',
        config.borderClass,
        config.bgClass,
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            config.iconBgClass,
          )}
        >
          <config.Icon size={20} className={config.iconClass} />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <p className={cn('text-sm font-semibold', config.titleClass)}>
              {config.title}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">{config.subtitle}</p>
          </div>

          {/* Progress bar for in-progress states */}
          {config.progress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Framsteg</span>
                <span className="text-zinc-400 font-mono">
                  {config.progress.confirmed}/{config.progress.total} klara
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className={cn('h-full rounded-full', config.progressBarClass)}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${config.progress.total > 0 ? (config.progress.confirmed / config.progress.total) * 100 : 0}%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Action area */}
          <div className="flex flex-wrap items-center gap-3">
            {config.showRoundCountInput && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Rundor:</span>
                <input
                  type="number"
                  min={1}
                  max={maxRounds}
                  value={roundCount}
                  onChange={(e) =>
                    onRoundCountChange(Math.max(1, Math.min(maxRounds, Number(e.target.value))))
                  }
                  className="w-14 h-9 px-2 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-white text-center outline-none focus:border-brand-500"
                />
              </div>
            )}

            {config.showKnockoutSizeInput && knockoutSizeOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Slutspel:</span>
                <select
                  value={knockoutSize}
                  onChange={(e) => onKnockoutSizeChange(Number(e.target.value))}
                  className="h-9 px-2 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-white outline-none focus:border-brand-500"
                >
                  {knockoutSizeOptions.map((n) => (
                    <option key={n} value={n}>
                      Topp {n}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {config.showTableCountInput && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Bord:</span>
                <input
                  type="number"
                  min={1}
                  max={32}
                  value={tableCount}
                  onChange={(e) => onTableCountChange(Math.max(1, Math.min(32, Number(e.target.value))))}
                  className="w-14 h-9 px-2 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-white text-center outline-none focus:border-brand-500"
                />
              </div>
            )}

            {config.showTimeInput && (
              <input
                type="time"
                value={roundTime}
                onChange={(e) => onRoundTimeChange(e.target.value)}
                className="h-9 px-3 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-white outline-none focus:border-brand-500"
              />
            )}

            {config.action && (
              <button
                onClick={() => {
                  switch (config.action!.handler) {
                    case 'tab_teams': onTabChange('teams'); break;
                    case 'start': onStartTournament(); break;
                    case 'generate_pairings': onGeneratePairings(); break;
                    case 'advance_round': onAdvanceRound(); break;
                    case 'start_knockout': onStartKnockout(); break;
                    case 'generate_next_knockout': onGenerateNextKnockoutRound(); break;
                    case 'finish': onFinishTournament(); break;
                  }
                }}
                disabled={
                  generating ||
                  (config.action.handler === 'generate_next_knockout' && knockoutBlockedByTie)
                }
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2',
                  config.action.buttonClass,
                  'disabled:opacity-50',
                )}
              >
                <span className={cn(config.action.buttonClass.includes('bg-brand-500') && 'hdr-white-fill')}>
                  {generating ? 'Vänta…' : config.action.label}
                </span>
                {!generating && <ChevronRight size={14} />}
              </button>
            )}
          </div>

          {flowState === 'swiss_generate' && schedulePreview && (
            <p className="text-xs text-zinc-500">
              {schedulePreview.matchCount} matcher · {tableCount} bord · {schedulePreview.waveCount} spelpass
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

type ActionHandler =
  | 'tab_teams'
  | 'start'
  | 'generate_pairings'
  | 'advance_round'
  | 'start_knockout'
  | 'generate_next_knockout'
  | 'finish';

interface CardConfig {
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  iconBgClass: string;
  borderClass: string;
  bgClass: string;
  titleClass: string;
  title: string;
  subtitle: string;
  progress: { confirmed: number; total: number } | null;
  progressBarClass: string;
  showTimeInput: boolean;
  showRoundCountInput: boolean;
  showTableCountInput: boolean;
  showKnockoutSizeInput: boolean;
  action: {
    label: string;
    handler: ActionHandler;
    buttonClass: string;
  } | null;
}

const BRAND_THEME = {
  iconClass: 'text-brand-400 hdr-brand-icon',
  iconBgClass: 'bg-brand-500/10',
  borderClass: 'border-brand-500/20 hdr-brand-border',
  bgClass: 'bg-brand-500/[0.03]',
  titleClass: 'text-brand-300 hdr-text-fill-300',
} as const;

const AMBER_THEME = {
  iconClass: 'text-amber-400',
  iconBgClass: 'bg-amber-500/10',
  borderClass: 'border-amber-500/20',
  bgClass: 'bg-amber-500/[0.03]',
  titleClass: 'text-amber-300',
} as const;

const EMERALD_THEME = {
  iconClass: 'text-emerald-400',
  iconBgClass: 'bg-emerald-500/10',
  borderClass: 'border-emerald-500/20',
  bgClass: 'bg-emerald-500/[0.03]',
  titleClass: 'text-emerald-300',
} as const;

const BRAND_PRIMARY_BTN = 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:brightness-110';
const AMBER_BTN = 'bg-amber-500/15 text-amber-400 border border-amber-500/20 hover:bg-amber-500/25';

function getCardConfig(
  flowState: FlowState,
  currentRound: number,
  roundsMap: Map<number, Match[]>,
  championName: string | null,
  totalRounds: number,
  ko: KnockoutInfo,
): CardConfig {
  const base: CardConfig = {
    Icon: Clock,
    iconClass: 'text-zinc-400',
    iconBgClass: 'bg-white/[0.06]',
    borderClass: 'border-white/[0.08]',
    bgClass: 'bg-white/[0.02]',
    titleClass: 'text-white',
    title: '',
    subtitle: '',
    progress: null,
    progressBarClass: 'bg-brand-500',
    showTimeInput: false,
    showRoundCountInput: false,
    showTableCountInput: false,
    showKnockoutSizeInput: false,
    action: null,
  };

  // Labels for the round just played / to be generated, used by the knockout states.
  const currentLabel = ko.labels[ko.currentIdx] ?? 'Slutspel';
  const nextLabel = ko.labels[ko.currentIdx + 1] ?? 'Slutspel';
  const firstLabel = ko.labels[0] ?? 'Slutspel';
  const isFinalRound = ko.currentIdx === ko.numRounds - 1;

  switch (flowState) {
    case 'no_teams':
      return {
        ...base,
        Icon: Users,
        iconClass: 'text-zinc-400',
        iconBgClass: 'bg-zinc-500/10',
        borderClass: 'border-zinc-500/20',
        title: 'Steg 1: Skapa lag',
        subtitle: 'Inga lag registrerade. Gå till fliken "Lag" och skapa lag först.',
        action: {
          label: 'Gå till Lag',
          handler: 'tab_teams',
          buttonClass: 'bg-white/[0.06] text-zinc-300 border border-white/[0.08] hover:bg-white/[0.1]',
        },
      };

    case 'not_started':
      return {
        ...base,
        ...BRAND_THEME,
        Icon: Play,
        title: 'Steg 2: Starta turneringen',
        subtitle: 'Alla lag är redo. Välj swiss-rundor, slutspelsstorlek och antal bord innan start.',
        showRoundCountInput: true,
        showKnockoutSizeInput: true,
        showTableCountInput: true,
        action: { label: 'Starta turnering', handler: 'start', buttonClass: BRAND_PRIMARY_BTN },
      };

    case 'swiss_generate':
      return {
        ...base,
        ...BRAND_THEME,
        Icon: Shuffle,
        title: `Runda ${currentRound}: Generera lottning`,
        subtitle: `Generera matchlottning för runda ${currentRound} av ${totalRounds}.`,
        showTimeInput: true,
        action: { label: 'Generera lottning', handler: 'generate_pairings', buttonClass: BRAND_PRIMARY_BTN },
      };

    case 'swiss_in_progress':
      return {
        ...base,
        ...BRAND_THEME,
        title: `Runda ${currentRound}: Väntar på resultat`,
        subtitle: 'Resultat rapporteras av lagen. Bekräfta disputerade matcher nedan.',
        progress: getProgress(roundsMap.get(currentRound) ?? []),
      };

    case 'swiss_round_done':
      return {
        ...base,
        ...EMERALD_THEME,
        Icon: CheckCircle2,
        title: `Runda ${currentRound} klar!`,
        subtitle: 'Alla matcher i rundan är bekräftade. Fortsätt till nästa runda.',
        action: {
          label: 'Nästa runda',
          handler: 'advance_round',
          buttonClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25',
        },
      };

    case 'swiss_done':
      return {
        ...base,
        ...AMBER_THEME,
        Icon: Swords,
        title: 'Swiss klart!',
        subtitle: `Alla ${totalRounds} swiss-rundor är klara. Gå vidare till slutspelet.`,
        action: { label: 'Gå till slutspel', handler: 'start_knockout', buttonClass: AMBER_BTN },
      };

    case 'knockout_generate':
      return {
        ...base,
        ...AMBER_THEME,
        Icon: Swords,
        title: `Slutspel: Generera ${firstLabel.toLowerCase()}`,
        subtitle: `Topp ${ko.size} från swiss möts. Generera matcherna.`,
        showTimeInput: true,
        action: {
          label: `Generera ${firstLabel.toLowerCase()}`,
          handler: 'generate_next_knockout',
          buttonClass: AMBER_BTN,
        },
      };

    case 'knockout_round_in_progress':
      return {
        ...base,
        ...AMBER_THEME,
        Icon: isFinalRound ? Trophy : Clock,
        title: `${currentLabel}: Väntar på resultat`,
        subtitle: isFinalRound ? 'Finalen pågår!' : `${currentLabel}matcherna pågår.`,
        progress: getProgress(ko.currentMatches),
        progressBarClass: 'bg-amber-500',
      };

    case 'knockout_round_done':
      return {
        ...base,
        ...AMBER_THEME,
        Icon: CheckCircle2,
        title: `${currentLabel} klar!`,
        subtitle: `Alla ${currentLabel.toLowerCase()}matcher avgjorda. Generera ${nextLabel.toLowerCase()}.`,
        showTimeInput: true,
        action: {
          label: `Generera ${nextLabel.toLowerCase()}`,
          handler: 'generate_next_knockout',
          buttonClass: AMBER_BTN,
        },
      };

    case 'knockout_complete':
      return {
        ...base,
        ...AMBER_THEME,
        Icon: Trophy,
        borderClass: 'border-amber-500/25',
        bgClass: 'bg-amber-500/[0.04]',
        title: `Turnering klar! ${championName ? `Vinnare: ${championName}` : ''}`,
        subtitle: 'Finalen är avgjord. Avsluta turneringen för att markera den som klar.',
        action: { label: 'Avsluta turnering', handler: 'finish', buttonClass: AMBER_BTN },
      };

    case 'finished':
      return {
        ...base,
        ...EMERALD_THEME,
        Icon: Sparkles,
        title: `Turneringen är avslutad${championName ? ` — ${championName} vann!` : ''}`,
        subtitle: 'Grattis till vinnarna!',
      };

    default:
      return { ...base, title: 'Okänt tillstånd', subtitle: '' };
  }
}
