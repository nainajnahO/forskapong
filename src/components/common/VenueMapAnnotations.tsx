import { motion } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { VENUE_MAP_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useAnnotationTransform } from '@/hooks/useAnnotationTransform';

interface VenueMapAnnotationsProps {
  scrollYProgress: MotionValue<number>;
}

function Annotation({
  text,
  subtext,
  scrollRange,
  scrollYProgress,
}: {
  text: string;
  subtext: string;
  scrollRange: readonly [number, number];
  scrollYProgress: MotionValue<number>;
}) {
  const { opacity, y } = useAnnotationTransform({ scrollYProgress, scrollRange });

  return (
    <motion.div
      className="absolute z-10 pointer-events-none left-0 right-0 top-24"
      style={{ opacity, y }}
    >
      <p
        className={cn(
          'font-display text-3xl md:text-5xl lg:text-6xl text-white hdr-white-fill',
          'text-center',
        )}
      >
        {text}
      </p>
      <p
        className={cn(
          'font-sans text-base md:text-xl text-zinc-400 text-center mt-1 whitespace-pre-line',
        )}
      >
        {subtext}
      </p>
    </motion.div>
  );
}

export default function VenueMapAnnotations({ scrollYProgress }: VenueMapAnnotationsProps) {
  return (
    <>
      {VENUE_MAP_CONFIG.annotations.map((annotation) => (
        <Annotation
          key={annotation.text}
          text={annotation.text}
          subtext={annotation.subtext}
          scrollRange={annotation.scrollRange}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </>
  );
}
