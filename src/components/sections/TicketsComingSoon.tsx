import { useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/contexts/useTheme';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { useIsVisible } from '@/hooks/useIsVisible';
import { cn } from '@/lib/utils';
import { themeText, themeGradientLine } from '@/lib/theme-utils';
import Container from '../common/Container';
import SectionLabel from '../common/SectionLabel';
import Particles from '../ui/Particles';

interface TicketsComingSoonProps {
  id?: string;
}

function generateCode(): string {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  const digits = Array.from({ length: 3 }, () =>
    Math.floor(Math.random() * 10)
  ).join('');
  return `${letters}.${digits}`;
}

export default function TicketsComingSoon({ id }: TicketsComingSoonProps) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const isVisible = useIsVisible(sectionRef);
  const vw = useViewportWidth();
  const isMobile = vw < 768;

  const [teamName, setTeamName] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setGeneratedCode(generateCode());
    setSubmitted(true);
  }

  return (
    <section ref={sectionRef} id={id} className="relative w-full py-16 md:py-24 overflow-hidden">
      <Particles
        className="absolute inset-0"
        quantity={isMobile ? 30 : 80}
        staticity={40}
        ease={60}
        size={isMobile ? 0.3 : 0.4}
        refresh={isMobile}
        color={theme === 'dark' ? '#ffffff' : '#71717a'}
        paused={!isVisible}
      />

      <Container className="relative z-10">
        <SectionLabel variant="gradient">ANMÄLAN</SectionLabel>

        <div ref={ref} className="flex flex-col items-center text-center">
          {!submitted ? (
            <>
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
                    'placeholder:opacity-40',
                    theme === 'dark'
                      ? 'border-zinc-700 text-zinc-100 focus:border-brand-500'
                      : 'border-zinc-300 text-zinc-900 focus:border-brand-500'
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
            </>
          ) : (
            <>
              <motion.h2
                className="font-display text-5xl md:text-7xl lg:text-8xl text-brand-500 tracking-wider hdr-text-fill"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                {teamName}
              </motion.h2>

              <motion.p
                className={cn(
                  'mt-8 font-mono text-4xl md:text-6xl lg:text-7xl font-bold tracking-widest text-brand-500'
                )}
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

            </>
          )}

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
