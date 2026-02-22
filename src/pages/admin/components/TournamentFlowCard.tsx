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

interface Props {
  tournament: Tournament | null;
  teams: { length: number };
  roundsMap: Map<number, Match[]>;
  generating: boolean;
  roundTime: string;
  onRoundTimeChange: (v: string) => void;
  onStartTournament: () => void;
  onGeneratePairings: () => void;
  onAdvanceRound: () => void;
  onStartKnockout: () => void;
  onGenerateKnockout: () => void;
  onGenerateSemifinals: () => void;
  onGenerateFinal: () => void;
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
  | 'knockout_generate_qf'
  | 'knockout_qf_in_progress'
  | 'knockout_qf_done'
  | 'knockout_sf_in_progress'
  | 'knockout_sf_done'
  | 'knockout_final_in_progress'
  | 'knockout_final_done'
  | 'finished';

function deriveFlowState(
  tournament: Tournament | null,
  teamsCount: number,
  roundsMap: Map<number, Match[]>,
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

    if (currentRound >= 7) return 'swiss_done';
    return 'swiss_round_done';
  }

  if (status === 'knockout') {
    const qfMatches = roundsMap.get(8) ?? [];
    const sfMatches = roundsMap.get(9) ?? [];
    const finalMatches = roundsMap.get(10) ?? [];

    if (qfMatches.length === 0) return 'knockout_generate_qf';

    const allQfConfirmed = qfMatches.length === 4 && qfMatches.every((m) => m.confirmed);
    if (!allQfConfirmed) return 'knockout_qf_in_progress';

    if (sfMatches.length === 0) return 'knockout_qf_done';

    const allSfConfirmed = sfMatches.length === 2 && sfMatches.every((m) => m.confirmed);
    if (!allSfConfirmed) return 'knockout_sf_in_progress';

    if (finalMatches.length === 0) return 'knockout_sf_done';

    const finalDone = finalMatches.length === 1 && finalMatches[0].confirmed;
    if (!finalDone) return 'knockout_final_in_progress';

    return 'knockout_final_done';
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
    onRoundTimeChange,
    onStartTournament,
    onGeneratePairings,
    onAdvanceRound,
    onStartKnockout,
    onGenerateKnockout,
    onGenerateSemifinals,
    onGenerateFinal,
    onFinishTournament,
    onTabChange,
    championName,
  } = props;

  const flowState = deriveFlowState(tournament, teams.length, roundsMap);
  const currentRound = tournament?.current_round ?? 0;

  const config = getCardConfig(flowState, currentRound, roundsMap, championName);

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
                    case 'generate_knockout': onGenerateKnockout(); break;
                    case 'generate_sf': onGenerateSemifinals(); break;
                    case 'generate_final': onGenerateFinal(); break;
                    case 'finish': onFinishTournament(); break;
                  }
                }}
                disabled={generating}
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
  | 'generate_knockout'
  | 'generate_sf'
  | 'generate_final'
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
    action: null,
  };

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
        subtitle: 'Alla lag är redo. Starta turneringen för att börja swiss-rundan.',
        action: { label: 'Starta turnering', handler: 'start', buttonClass: BRAND_PRIMARY_BTN },
      };

    case 'swiss_generate':
      return {
        ...base,
        ...BRAND_THEME,
        Icon: Shuffle,
        title: `Runda ${currentRound}: Generera lottning`,
        subtitle: `Generera matchlottning för runda ${currentRound} av 7.`,
        showTimeInput: true,
        action: { label: 'Generera lottning', handler: 'generate_pairings', buttonClass: BRAND_PRIMARY_BTN },
      };

    case 'swiss_in_progress': {
      const roundMatches = roundsMap.get(currentRound) ?? [];
      return {
        ...base,
        ...BRAND_THEME,
        title: `Runda ${currentRound}: Väntar på resultat`,
        subtitle: 'Resultat rapporteras av lagen. Bekräfta disputerade matcher nedan.',
        progress: getProgress(roundMatches),
      };
    }

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
        subtitle: 'Alla 7 swiss-rundor är klara. Gå vidare till slutspelet.',
        action: { label: 'Gå till slutspel', handler: 'start_knockout', buttonClass: AMBER_BTN },
      };

    case 'knockout_generate_qf':
      return {
        ...base,
        ...AMBER_THEME,
        Icon: Swords,
        title: 'Slutspel: Generera kvartsfinaler',
        subtitle: 'Top 8 från swiss möts i kvartsfinal. Generera matcherna.',
        showTimeInput: true,
        action: { label: 'Generera kvartsfinaler', handler: 'generate_knockout', buttonClass: AMBER_BTN },
      };

    case 'knockout_qf_in_progress': {
      const qfMatches = roundsMap.get(8) ?? [];
      return {
        ...base,
        ...AMBER_THEME,
        title: 'Kvartsfinal: Väntar på resultat',
        subtitle: 'Kvartsfinalmatcherna pågår.',
        progress: getProgress(qfMatches),
        progressBarClass: 'bg-amber-500',
      };
    }

    case 'knockout_qf_done':
      return {
        ...base,
        ...AMBER_THEME,
        Icon: CheckCircle2,
        title: 'Kvartsfinal klar!',
        subtitle: 'Alla kvartsfinaler avgjorda. Generera semifinalerna.',
        action: { label: 'Generera semifinaler', handler: 'generate_sf', buttonClass: AMBER_BTN },
      };

    case 'knockout_sf_in_progress': {
      const sfMatches = roundsMap.get(9) ?? [];
      return {
        ...base,
        ...AMBER_THEME,
        title: 'Semifinal: Väntar på resultat',
        subtitle: 'Semifinalerna pågår.',
        progress: getProgress(sfMatches),
        progressBarClass: 'bg-amber-500',
      };
    }

    case 'knockout_sf_done':
      return {
        ...base,
        ...AMBER_THEME,
        Icon: CheckCircle2,
        title: 'Semifinal klar!',
        subtitle: 'Båda semifinalerna avgjorda. Generera finalen.',
        action: { label: 'Generera final', handler: 'generate_final', buttonClass: AMBER_BTN },
      };

    case 'knockout_final_in_progress': {
      const finalMatches = roundsMap.get(10) ?? [];
      return {
        ...base,
        ...AMBER_THEME,
        Icon: Trophy,
        title: 'Final: Väntar på resultat',
        subtitle: 'Finalen pågår!',
        progress: getProgress(finalMatches),
        progressBarClass: 'bg-amber-500',
      };
    }

    case 'knockout_final_done':
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
