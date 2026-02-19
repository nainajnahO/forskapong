import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/useTheme';
import { useIsVisible } from '@/hooks/useIsVisible';
import { useScrollToSection } from '@/hooks/useScrollToSection';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';
import { buildSwishUrl } from '@/lib/constants';
import swishQR from '@/assets/swish-QR-small.png';
import type { WarpSpeedConfig } from '@/lib/warpspeed';
import Container from '../common/Container';
import SectionLabel from '../common/SectionLabel';
import WarpSpeedCanvas from '../ui/WarpSpeedCanvas';

interface TicketsComingSoonProps {
  id?: string;
}

type Phase = 'form' | 'warping' | 'result';

/** Format DB code "ABC123" → "ABC·123" for display */
function formatCode(code: string): string {
  return `${code.slice(0, 3)}·${code.slice(3)}`;
}

export default function TicketsComingSoon({ id }: TicketsComingSoonProps) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const isVisible = useIsVisible(sectionRef);
  const scrollToSection = useScrollToSection();

  const stored = useMemo(() => {
    try {
      const raw = localStorage.getItem('forskopong_registered');
      if (raw) return JSON.parse(raw) as { teamName: string; code: string };
    } catch { /* ignore */ }
    return null;
  }, []);

  const [teamName, setTeamName] = useState(stored?.teamName ?? '');
  const [rawCode, setRawCode] = useState(stored?.code ?? '');
  const [generatedCode, setGeneratedCode] = useState(stored ? formatCode(stored.code) : '');
  const [phase, setPhase] = useState<Phase>(stored ? 'result' : 'form');
  const [error, setError] = useState('');

  const warpConfig = useMemo<WarpSpeedConfig>(
    () => ({
      backgroundColor: theme === 'dark' ? '#000000' : '#fafafa',
      starColor: theme === 'dark' ? '#ffffff' : '#71717a',
      density: 0.7,
      starSize: 3,
      speed: 0.7,
      speedAdjFactor: 0.03,
      warpEffect: true,
      warpEffectLength: 5,
      depthFade: true,
      shape: 'circle',
    }),
    [theme],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = teamName.trim();
    if (!trimmed) return;

    // Dismiss mobile keyboard and re-center section
    (document.activeElement as HTMLElement)?.blur();
    scrollToSection('#tickets');

    setError('');
    setPhase('warping');

    const delay = new Promise((r) => setTimeout(r, 2500));
    const [{ data, error: rpcError }] = await Promise.all([
      supabase.rpc('register_team', { team_name: trimmed }),
      delay,
    ]);

    if (rpcError || !data || data.length === 0) {
      setPhase('form');
      setError(
        rpcError?.message?.includes('DUPLICATE_NAME')
          ? 'Det lagnamnet är redan taget, välj ett annat'
          : 'Något gick fel, försök igen',
      );
      return;
    }

    const team = data[0];
    setRawCode(team.code);
    setGeneratedCode(formatCode(team.code));
    setPhase('result');

    try {
      localStorage.setItem('forskopong_registered', JSON.stringify({ teamName: trimmed, code: team.code }));
    } catch { /* storage full or unavailable */ }
  }

  return (
    <section ref={sectionRef} id={id} className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <WarpSpeedCanvas
        className="absolute inset-0"
        speed={phase === 'warping' ? 25 : 0.7}
        paused={!isVisible}
        config={warpConfig}
      />

      <Container className="relative z-10">
        {phase === 'form' && (
          <SectionLabel variant="gradient">ANMÄLAN</SectionLabel>
        )}

        <div ref={ref} className="flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            {phase === 'form' && (
              <motion.div
                key="form"
                className="flex flex-col items-center"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <motion.h2
                  className="font-display text-5xl md:text-7xl lg:text-8xl text-brand-500 tracking-wider hdr-text-fill"
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  Anmäl ert lag
                </motion.h2>

                <motion.p
                  className={cn('mt-6 max-w-md text-lg md:text-xl', themeText(theme, 'secondary'))}
                  initial={{ opacity: 0, y: 12 }}
                  animate={isInView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                >
                  Ange ert lagnamn för att registrera er
                </motion.p>

                <motion.form
                  onSubmit={handleSubmit}
                  className="mt-8 flex items-center gap-3 w-full max-w-sm"
                  initial={{ opacity: 0, y: 12 }}
                  animate={isInView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                >
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Lagnamn"
                    className={cn(
                      'flex-1 min-w-0 rounded-xl px-5 h-12 text-center text-lg font-medium',
                      'bg-transparent border outline-none transition-colors',
                      'placeholder:opacity-40 focus:border-brand-500',
                      theme === 'dark'
                        ? 'border-zinc-700 text-zinc-100'
                        : 'border-zinc-300 text-zinc-900'
                    )}
                  />
                  <button
                    type="submit"
                    disabled={!teamName.trim()}
                    className={cn(
                      'shrink-0 h-12 w-12 flex items-center justify-center rounded-xl',
                      'bg-brand-500 text-white shadow-lg shadow-brand-500/20',
                      'hover:brightness-110 transition-all',
                      'disabled:opacity-40 disabled:cursor-not-allowed'
                    )}
                  >
                    <ArrowRight className="size-5" />
                  </button>
                </motion.form>

                {error && (
                  <motion.p
                    className="mt-4 text-sm text-red-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}

            {phase === 'result' && (
              <motion.div
                key="result"
                className="flex flex-col items-center"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <motion.h2
                  className={cn('text-2xl md:text-3xl font-medium', themeText(theme, 'secondary'))}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  {teamName}
                </motion.h2>

                <motion.p
                  className="mt-8 font-display text-5xl md:text-7xl lg:text-8xl tracking-widest text-white hdr-white-fill"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {generatedCode}
                </motion.p>

                <motion.p
                  className={cn('mt-6 max-w-md text-lg md:text-xl', themeText(theme, 'secondary'))}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  Spara koden — ni behöver den för att logga in
                </motion.p>

                <motion.a
                  href={buildSwishUrl(rawCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-block"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  <img src={swishQR} alt="Swish QR-kod" className="w-48 rounded-xl" />
                </motion.a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}
