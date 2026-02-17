import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/useTheme';
import { useIsVisible } from '@/hooks/useIsVisible';
import { useScrollToSection } from '@/hooks/useScrollToSection';
import { cn } from '@/lib/utils';
import { themeText, themeGradientLine } from '@/lib/theme-utils';
import type { WarpSpeedConfig } from '@/lib/warpspeed';
import Container from '../common/Container';
import SectionLabel from '../common/SectionLabel';
import WarpSpeedCanvas from '../ui/WarpSpeedCanvas';

interface TicketsComingSoonProps {
  id?: string;
}

type Phase = 'form' | 'warping' | 'result';

function generateCode(): string {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  const digits = Array.from({ length: 3 }, () =>
    Math.floor(Math.random() * 10)
  ).join('');
  return `${letters}·${digits}`;
}

export default function TicketsComingSoon({ id }: TicketsComingSoonProps) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const isVisible = useIsVisible(sectionRef);
  const scrollToSection = useScrollToSection();

  const [teamName, setTeamName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [phase, setPhase] = useState<Phase>('form');

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;

    // Dismiss mobile keyboard and re-center section
    (document.activeElement as HTMLElement)?.blur();
    scrollToSection('#tickets');

    setGeneratedCode(generateCode());
    setPhase('warping');
    setTimeout(() => setPhase('result'), 2500);
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
        <SectionLabel variant="gradient">ANMÄLAN</SectionLabel>

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
              </motion.div>
            )}

            {phase === 'result' && (
              <motion.div
                key="result"
                className="flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <motion.h2
                  className={cn('text-2xl md:text-3xl font-medium', themeText(theme, 'secondary'))}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  {teamName}
                </motion.h2>

                <motion.p
                  className="mt-8 font-display text-5xl md:text-7xl lg:text-8xl tracking-widest text-white hdr-white-fill"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                >
                  {generatedCode}
                </motion.p>

                <motion.p
                  className={cn('mt-6 max-w-md text-lg md:text-xl', themeText(theme, 'secondary'))}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                >
                  Spara koden — ni behöver den för att logga in
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            className={cn('mt-10 h-px w-48', themeGradientLine(theme))}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: [0.4, 0.8, 0.4] } : undefined}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      </Container>
    </section>
  );
}
