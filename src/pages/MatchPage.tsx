import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';
import { supabase } from '@/lib/supabase';
import type { Team, Match } from '@/lib/database.types';
import Container from '../components/common/Container';
import SectionLabel from '../components/common/SectionLabel';

/* ─── Types ───────────────────────────────────────────────────── */

interface MatchWithTeams extends Match {
  team1: Pick<Team, 'id' | 'name' | 'player1' | 'player2'>;
  team2: Pick<Team, 'id' | 'name' | 'player1' | 'player2'>;
}

/* ─── Data ────────────────────────────────────────────────────── */

async function fetchMatch(matchId: string): Promise<MatchWithTeams> {
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();

  if (matchError) throw matchError;

  const [team1Result, team2Result] = await Promise.all([
    supabase.from('teams').select('*').eq('id', match.team1_id).single(),
    supabase.from('teams').select('*').eq('id', match.team2_id).single(),
  ]);

  if (team1Result.error) throw team1Result.error;
  if (team2Result.error) throw team2Result.error;

  return {
    ...match,
    team1: team1Result.data,
    team2: team2Result.data,
  } as MatchWithTeams;
}

/* ─── Icons ───────────────────────────────────────────────────── */

const iconBase = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function ArrowLeftIcon() {
  return (
    <svg width={18} height={18} {...iconBase}>
      <path d="M19 12H5" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width={16} height={16} {...iconBase}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width={16} height={16} {...iconBase}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

/* ─── Score Picker ────────────────────────────────────────────── */

function ScorePicker({
  theme,
  value,
  onChange,
  label,
  max = 6,
}: {
  theme: ReturnType<typeof useTheme>['theme'];
  value: number;
  onChange: (v: number) => void;
  label: string;
  max?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className={cn('text-xs font-medium', themeText(theme, 'secondary'))}>{label}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-all',
            'disabled:opacity-20',
            theme === 'dark'
              ? 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]'
              : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300',
          )}
        >
          −
        </button>
        <span className="w-12 text-center text-3xl font-bold font-mono text-foreground">
          {value}
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold transition-all',
            'disabled:opacity-20',
            theme === 'dark'
              ? 'bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]'
              : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300',
          )}
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ─── Match Page ──────────────────────────────────────────────── */

export default function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const teamId = sessionStorage.getItem('teamId');

  const [match, setMatch] = useState<MatchWithTeams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reporting state
  const [step, setStep] = useState<'idle' | 'won' | 'lost' | 'done'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loserCups, setLoserCups] = useState(0); // cups hit by the losing team (0–5)
  const [submitError, setSubmitError] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!teamId) {
      navigate('/play', { replace: true });
    }
  }, [teamId, navigate]);

  // Fetch match
  const loadMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      const data = await fetchMatch(matchId);
      setMatch(data);
      setError('');
    } catch (err) {
      console.error('Failed to load match:', err);
      setError('Kunde inte ladda matchen.');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  // Real-time subscription
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        () => {
          loadMatch();
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [matchId, loadMatch]);

  if (!teamId) return null;

  // ── Derived state ──────────────────────────────
  const isTeam1 = match?.team1_id === teamId;
  const ourTeam = match ? (isTeam1 ? match.team1 : match.team2) : null;
  const theirTeam = match ? (isTeam1 ? match.team2 : match.team1) : null;

  const isPlayed = match?.winner_id !== null && match?.winner_id !== undefined;
  const isDisputed = match?.confirmed_by === 'disputed' && !match?.confirmed;
  const weWon = match?.winner_id === teamId;
  const weLost = match?.loser_id === teamId;
  const weReported = match?.reported_by === teamId;
  const needsOurConfirmation = weLost && !match?.confirmed && !weReported && !isDisputed;

  // Format score from our perspective
  const scoreDisplay =
    match?.score_team1 != null && match?.score_team2 != null
      ? `${isTeam1 ? match.score_team1 : match.score_team2}–${isTeam1 ? match.score_team2 : match.score_team1}`
      : null;

  const cardBg = theme === 'dark' ? 'bg-white/[0.03]' : 'bg-zinc-50';
  const cardBorder = theme === 'dark' ? 'border-white/[0.06]' : 'border-zinc-200';

  // ── Report result ──────────────────────────────
  // Cups hit: winner always = 6, loser = loserCups (0–5)
  // score_team1/score_team2 = cups HIT by that team
  const handleReport = async (weAreWinner: boolean) => {
    if (!match || !teamId) return;
    setIsSubmitting(true);
    setSubmitError('');

    const opponentId = isTeam1 ? match.team2_id : match.team1_id;
    const winnerId = weAreWinner ? teamId : opponentId;
    const loserId = weAreWinner ? opponentId : teamId;

    // Winner always hit 6, loser hit loserCups
    const winnerScore = 6;
    const team1IsWinner = winnerId === match.team1_id;
    const scoreTeam1 = team1IsWinner ? winnerScore : loserCups;
    const scoreTeam2 = team1IsWinner ? loserCups : winnerScore;

    const { error: updateError } = await supabase
      .from('matches')
      .update({
        winner_id: winnerId,
        loser_id: loserId,
        score_team1: scoreTeam1,
        score_team2: scoreTeam2,
        reported_by: teamId,
      })
      .eq('id', match.id);

    if (updateError) {
      setSubmitError('Kunde inte spara resultatet. Försök igen.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setStep('done');
    loadMatch();
  };

  // ── Confirm result ─────────────────────────────
  const handleConfirm = async () => {
    if (!match) return;
    setSubmitError('');

    const { error: updateError } = await supabase
      .from('matches')
      .update({
        confirmed: true,
        confirmed_by: 'loser',
      })
      .eq('id', match.id);

    if (updateError) {
      setSubmitError('Kunde inte bekräfta. Försök igen.');
      return;
    }

    loadMatch();
  };

  // ── Dispute ────────────────────────────────────
  const handleDispute = async () => {
    if (!match) return;
    setSubmitError('');

    const { error: updateError } = await supabase
      .from('matches')
      .update({ confirmed_by: 'disputed' })
      .eq('id', match.id);

    if (updateError) {
      setSubmitError('Kunde inte disputera. Försök igen.');
      return;
    }

    loadMatch();
  };

  /* ── Loading ────────────────────────────────────── */
  if (loading) {
    return (
      <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className={cn('text-sm', themeText(theme, 'secondary'))}>Laddar match…</p>
        </motion.div>
      </section>
    );
  }

  /* ── Error ──────────────────────────────────────── */
  if (error || !match || !ourTeam || !theirTeam) {
    const detail = !match
      ? 'Matchdata saknas.'
      : !ourTeam || !theirTeam
        ? `Lagdata saknas. Ditt lag-ID: ${teamId}, Match team1: ${match.team1_id}, team2: ${match.team2_id}`
        : error;
    return (
      <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 flex items-center justify-center">
        <Container className="text-center">
          <p className="text-red-400 mb-2">{error || 'Matchen hittades inte.'}</p>
          <p className={cn('text-xs mb-4 font-mono', themeText(theme, 'secondary'))}>{detail}</p>
          <button
            onClick={() => navigate('/play/dashboard')}
            className="px-4 py-2 rounded-lg text-sm bg-brand-500 text-white"
          >
            Tillbaka
          </button>
        </Container>
      </section>
    );
  }

  return (
    <section className="relative w-full min-h-[calc(100vh-5rem)] pt-24 md:pt-28 pb-10 md:pb-16">
      <Container>
        <div>
          {/* ── Back button ───────────────────────────── */}
          <motion.button
            onClick={() => navigate('/play/dashboard')}
            className={cn(
              'inline-flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-70',
              themeText(theme, 'secondary'),
            )}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowLeftIcon />
            Tillbaka till schema
          </motion.button>

          {/* ── Match Header ──────────────────────────── */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <SectionLabel variant="gradient">RUNDA {match.round}</SectionLabel>

            {/* VS display */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 mt-4 mb-6">
              <div className="text-right flex-1">
                <p
                  className={cn(
                    'text-xl sm:text-2xl font-bold tracking-tight',
                    teamId === ourTeam.id ? 'text-brand-500' : 'text-foreground',
                  )}
                >
                  {ourTeam.name}
                </p>
                <p className={cn('text-xs mt-1', themeText(theme, 'secondary'))}>
                  {ourTeam.player1 && ourTeam.player2
                    ? `${ourTeam.player1} & ${ourTeam.player2}`
                    : ourTeam.player1 || ourTeam.player2 || '–'}
                </p>
              </div>

              <span
                className={cn(
                  'text-2xl sm:text-3xl font-display tracking-wider',
                  theme === 'dark' ? 'text-zinc-600' : 'text-zinc-300',
                )}
              >
                VS
              </span>

              <div className="text-left flex-1">
                <p
                  className={cn(
                    'text-xl sm:text-2xl font-bold tracking-tight',
                    teamId === theirTeam.id ? 'text-brand-500' : 'text-foreground',
                  )}
                >
                  {theirTeam.name}
                </p>
                <p className={cn('text-xs mt-1', themeText(theme, 'secondary'))}>
                  {theirTeam.player1 && theirTeam.player2
                    ? `${theirTeam.player1} & ${theirTeam.player2}`
                    : theirTeam.player1 || theirTeam.player2 || '–'}
                </p>
              </div>
            </div>

            {/* Match info */}
            <div className="flex items-center justify-center gap-6 text-sm">
              {match.scheduled_time && (
                <span
                  className={cn('inline-flex items-center gap-1.5', themeText(theme, 'secondary'))}
                >
                  <ClockIcon />
                  {match.scheduled_time}
                </span>
              )}
              {match.table_number && (
                <span
                  className={cn('inline-flex items-center gap-1.5', themeText(theme, 'secondary'))}
                >
                  <TableIcon />
                  Bord {match.table_number}
                </span>
              )}
            </div>
          </motion.div>

          {/* ── Main Card ─────────────────────────────── */}
          <motion.div
            className={cn('rounded-2xl p-6 sm:p-8 border max-w-lg mx-auto', cardBg, cardBorder)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          >
            {/* ─── STATE: Completed & confirmed ───────── */}
            {isPlayed && match.confirmed && (
              <div className="text-center">
                <div
                  className={cn(
                    'inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border mb-4',
                    weWon
                      ? theme === 'dark'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : theme === 'dark'
                        ? 'bg-red-500/15 text-red-400 border-red-500/20'
                        : 'bg-red-50 text-red-600 border-red-200',
                  )}
                >
                  {weWon ? 'Vinst!' : 'Förlust'}
                </div>

                {scoreDisplay && (
                  <p className="text-4xl font-mono font-bold text-foreground mb-2">
                    {scoreDisplay}
                  </p>
                )}

                <p className={cn('text-xs', themeText(theme, 'secondary'))}>Resultat bekräftat</p>
              </div>
            )}

            {/* ─── STATE: Disputed ────────────────────── */}
            {isPlayed && isDisputed && (
              <div className="text-center">
                <div
                  className={cn(
                    'inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border mb-4',
                    theme === 'dark'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                      : 'bg-amber-50 text-amber-600 border-amber-200',
                  )}
                >
                  Disputerad
                </div>

                {scoreDisplay && (
                  <p className="text-4xl font-mono font-bold text-foreground mb-2">
                    {scoreDisplay}
                  </p>
                )}

                <p className={cn('text-xs', themeText(theme, 'secondary'))}>
                  En admin kommer att avgöra resultatet.
                </p>
              </div>
            )}

            {/* ─── STATE: Reported, waiting for confirmation ── */}
            {isPlayed && !match.confirmed && !needsOurConfirmation && !isDisputed && (
              <div className="text-center">
                <div
                  className={cn(
                    'inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border mb-4',
                    theme === 'dark'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                      : 'bg-amber-50 text-amber-600 border-amber-200',
                  )}
                >
                  Väntar på bekräftelse
                </div>

                {scoreDisplay && (
                  <p className="text-4xl font-mono font-bold text-foreground mb-2">
                    {scoreDisplay}
                  </p>
                )}

                <p className={cn('text-xs', themeText(theme, 'secondary'))}>
                  {weReported
                    ? 'Du rapporterade detta resultat. Väntar på att motståndaren bekräftar.'
                    : 'Motståndaren har rapporterat resultatet. Väntar på bekräftelse.'}
                </p>
              </div>
            )}

            {/* ─── STATE: We need to confirm (loser) ──── */}
            {needsOurConfirmation && (
              <div className="text-center">
                <p className={cn('text-sm mb-2', themeText(theme, 'secondary'))}>
                  Motståndarlaget rapporterade:
                </p>

                {scoreDisplay && (
                  <p className="text-4xl font-mono font-bold text-foreground mb-1">
                    {scoreDisplay}
                  </p>
                )}

                <p className={cn('text-sm mb-6', themeText(theme, 'secondary'))}>
                  {theirTeam.name} vann
                </p>

                {submitError && <p className="text-sm text-amber-400 mb-4">{submitError}</p>}

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleConfirm}
                    className="px-6 py-3 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:brightness-110 transition-all"
                  >
                    Bekräfta resultat
                  </button>
                  <button
                    onClick={handleDispute}
                    className={cn(
                      'px-6 py-3 rounded-xl text-sm font-medium border transition-all hover:opacity-80',
                      theme === 'dark'
                        ? 'bg-white/[0.04] border-white/10 text-zinc-400'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-500',
                    )}
                  >
                    Disputera
                  </button>
                </div>
              </div>
            )}

            {/* ─── STATE: Not played yet — report ─────── */}
            {!isPlayed && step === 'idle' && (
              <div className="text-center">
                <p className={cn('text-sm mb-6', themeText(theme, 'secondary'))}>
                  Rapportera matchresultatet efter att ni spelat klart.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      setStep('won');
                      setLoserCups(0);
                    }}
                    className="px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all"
                  >
                    Vi vann 🎉
                  </button>
                  <button
                    onClick={() => {
                      setStep('lost');
                      setLoserCups(0);
                    }}
                    className={cn(
                      'px-6 py-3 rounded-xl text-sm font-semibold border transition-all hover:opacity-80',
                      theme === 'dark'
                        ? 'bg-red-500/15 text-red-400 border-red-500/20'
                        : 'bg-red-50 text-red-600 border-red-200',
                    )}
                  >
                    Vi förlorade
                  </button>
                </div>
              </div>
            )}

            {/* ─── STATE: Score picker (won — how many did THEY hit?) ── */}
            {!isPlayed && step === 'won' && (
              <div>
                <p className={cn('text-sm text-center mb-2 font-semibold text-emerald-400')}>
                  Ni vann!
                </p>
                <p className={cn('text-sm text-center mb-6', themeText(theme, 'secondary'))}>
                  Hur många koppar träffade motståndaren?
                </p>

                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className={cn('text-xs mb-1 font-medium', themeText(theme, 'secondary'))}>
                        {ourTeam.name}
                      </p>
                      <span className="text-3xl font-mono font-bold text-emerald-400">6</span>
                    </div>
                    <span
                      className={cn(
                        'text-xl font-display',
                        theme === 'dark' ? 'text-zinc-600' : 'text-zinc-300',
                      )}
                    >
                      –
                    </span>
                    <ScorePicker
                      theme={theme}
                      value={loserCups}
                      onChange={setLoserCups}
                      label={theirTeam.name}
                      max={5}
                    />
                  </div>
                </div>

                {submitError && (
                  <p className="text-sm text-red-400 text-center mb-4">{submitError}</p>
                )}

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => handleReport(true)}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:brightness-110 transition-all disabled:opacity-40"
                  >
                    {isSubmitting ? 'Sparar…' : 'Skicka resultat'}
                  </button>
                  <button
                    onClick={() => setStep('idle')}
                    className={cn(
                      'px-6 py-3 rounded-xl text-sm font-medium border transition-all hover:opacity-80',
                      theme === 'dark'
                        ? 'bg-white/[0.04] border-white/10 text-zinc-400'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-500',
                    )}
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}

            {/* ─── STATE: Score picker (lost — how many did WE hit?) ── */}
            {!isPlayed && step === 'lost' && (
              <div>
                <p className={cn('text-sm text-center mb-2 font-semibold text-red-400')}>
                  Ni förlorade
                </p>
                <p className={cn('text-sm text-center mb-6', themeText(theme, 'secondary'))}>
                  Hur många koppar träffade ni?
                </p>

                <div className="flex flex-col items-center gap-4 mb-8">
                  <div className="flex items-center gap-6">
                    <ScorePicker
                      theme={theme}
                      value={loserCups}
                      onChange={setLoserCups}
                      label={ourTeam.name}
                      max={5}
                    />
                    <span
                      className={cn(
                        'text-xl font-display',
                        theme === 'dark' ? 'text-zinc-600' : 'text-zinc-300',
                      )}
                    >
                      –
                    </span>
                    <div className="text-center">
                      <p className={cn('text-xs mb-1 font-medium', themeText(theme, 'secondary'))}>
                        {theirTeam.name}
                      </p>
                      <span className="text-3xl font-mono font-bold text-red-400">6</span>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <p className="text-sm text-red-400 text-center mb-4">{submitError}</p>
                )}

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => handleReport(false)}
                    disabled={isSubmitting}
                    className="px-6 py-3 rounded-xl text-sm font-semibold bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:brightness-110 transition-all disabled:opacity-40"
                  >
                    {isSubmitting ? 'Sparar…' : 'Skicka resultat'}
                  </button>
                  <button
                    onClick={() => setStep('idle')}
                    className={cn(
                      'px-6 py-3 rounded-xl text-sm font-medium border transition-all hover:opacity-80',
                      theme === 'dark'
                        ? 'bg-white/[0.04] border-white/10 text-zinc-400'
                        : 'bg-zinc-100 border-zinc-200 text-zinc-500',
                    )}
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            )}

            {/* ─── STATE: Submitting overlay ─────────── */}
            {isSubmitting && (
              <div className="flex flex-col items-center gap-3 py-4">
                <motion.div
                  className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className={cn('text-sm', themeText(theme, 'secondary'))}>Sparar resultat…</p>
              </div>
            )}

            {/* ─── STATE: Done (just submitted) ───────── */}
            {step === 'done' && (
              <div className="text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-sm font-semibold text-foreground mb-1">Resultat rapporterat!</p>
                <p className={cn('text-xs', themeText(theme, 'secondary'))}>
                  Väntar på att motståndarlaget bekräftar.
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Back to dashboard link ─────────────────── */}
          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <button
              onClick={() => navigate('/play/dashboard')}
              className={cn(
                'text-sm transition-opacity hover:opacity-70',
                themeText(theme, 'secondary'),
              )}
            >
              ← Tillbaka till matchschemat
            </button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
