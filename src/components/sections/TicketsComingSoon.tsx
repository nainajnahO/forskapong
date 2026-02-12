import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
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

export default function TicketsComingSoon({ id }: TicketsComingSoonProps) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const isVisible = useIsVisible(sectionRef);
  const vw = useViewportWidth();
  const isMobile = vw < 768;

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
        <SectionLabel variant="gradient">BILJETTER</SectionLabel>

        <div ref={ref} className="flex flex-col items-center text-center">
          <motion.h2
            className="font-display text-5xl md:text-7xl lg:text-8xl text-brand-500 tracking-wider hdr-text-fill"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            Kommer Snart
          </motion.h2>

          <motion.p
            className={cn('mt-6 max-w-md text-lg md:text-xl', themeText(theme, 'secondary'))}
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          >
            Biljetterna till Forskåpong 2026 släpps inom kort. Gör dig redo!
          </motion.p>

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
