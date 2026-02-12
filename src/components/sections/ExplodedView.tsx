import { useRef } from 'react';
import { useTransform, motion } from 'motion/react';
import { useExplodedViewScroll } from '@/hooks/useExplodedViewScroll';
import { useIsVisible } from '@/hooks/useIsVisible';
import ExplodedViewAnnotations from '@/components/common/ExplodedViewAnnotations';
import ExplodedViewCanvas from '@/components/common/ExplodedViewCanvas';
import { SHOWCASE_CONFIG, EXPLODED_VIEW_TITLE } from '@/lib/constants';
import Container from '@/components/common/Container';

interface ExplodedViewProps {
  id?: string;
}

export default function ExplodedView({ id }: ExplodedViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef);
  const { progressRef, scrollYProgress } = useExplodedViewScroll(containerRef);

  const { fadeStart, fadeEnd, yOffset } = EXPLODED_VIEW_TITLE;
  const fadeRange = fadeEnd - fadeStart;

  const titleOpacity = useTransform(scrollYProgress, (v) => {
    if (v < fadeStart) return 0;
    if (v > fadeEnd) return 1;
    return (v - fadeStart) / fadeRange;
  });
  const titleY = useTransform(scrollYProgress, (v) => {
    if (v < fadeStart) return yOffset;
    if (v > fadeEnd) return 0;
    return yOffset - (yOffset * (v - fadeStart)) / fadeRange;
  });

  return (
    <section
      ref={containerRef}
      id={id}
      style={{ height: `${SHOWCASE_CONFIG.scrollPages * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background">
        <ExplodedViewCanvas scrollProgress={progressRef} isVisible={isVisible} />
        <ExplodedViewAnnotations scrollYProgress={scrollYProgress} />

        {/* Title pinned to bottom-left, fades in at end of animation */}
        <motion.div
          className="absolute bottom-8 left-0 right-0 z-10 pointer-events-none"
          style={{ opacity: titleOpacity, y: titleY }}
        >
          <Container>
            <h1 className="text-4xl md:text-6xl font-display text-foreground hdr-white-fill transition-colors duration-500">
              Årets Mest
              <br />
              Hypade <span className="italic text-brand-400 hdr-text-fill-400">Event</span>
            </h1>
          </Container>
        </motion.div>
      </div>
    </section>
  );
}
