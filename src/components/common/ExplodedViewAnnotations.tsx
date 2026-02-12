import { motion } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { SHOWCASE_CONFIG } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useViewportWidth } from '@/hooks/useViewportWidth';
import { useAnnotationTransform } from '@/hooks/useAnnotationTransform';

// Derive annotation scroll ranges from camera waypoints so they're always in sync.
// Each annotation[i] is visible when the camera is near waypoint[i].
const waypoints = SHOWCASE_CONFIG.cameraWaypoints;
const computedRanges: [number, number][] = waypoints.map((wp, i) => {
  const prev = i > 0 ? waypoints[i - 1].progress : wp.progress;
  const next = i < waypoints.length - 1 ? waypoints[i + 1].progress : wp.progress;
  return [
    i === 0 ? 0 : (prev + wp.progress) / 2,
    i === waypoints.length - 1 ? 1 : (wp.progress + next) / 2,
  ];
});

interface ExplodedViewAnnotationsProps {
  scrollYProgress: MotionValue<number>;
}

function Annotation({
  text,
  subtext,
  position,
  scrollRange,
  scrollYProgress,
  isMobile,
  isFirst,
}: {
  text: string;
  subtext?: string;
  position: readonly [string, string];
  scrollRange: [number, number];
  scrollYProgress: MotionValue<number>;
  isMobile: boolean;
  isFirst: boolean;
}) {
  const { opacity, y } = useAnnotationTransform({ scrollYProgress, scrollRange, isFirst });

  return (
    <motion.div
      className={cn('absolute pointer-events-none', !isMobile && 'max-w-[80vw]')}
      style={{
        top: isMobile ? '6rem' : position[0],
        left: isMobile ? 0 : position[1],
        right: isMobile ? 0 : 'auto',
        transform: isMobile ? 'none' : 'translate(-50%, -50%)',
        opacity,
        y,
      }}
    >
      <p
        className={cn(
          'font-display text-3xl md:text-5xl lg:text-6xl text-white',
          'drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]',
          'text-center',
        )}
      >
        {text}
      </p>
      {subtext && (
        <p
          className={cn(
            'font-sans text-base md:text-xl text-zinc-400 text-center mt-1 whitespace-pre-line',
            'drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]',
          )}
        >
          {subtext}
        </p>
      )}
    </motion.div>
  );
}

export default function ExplodedViewAnnotations({ scrollYProgress }: ExplodedViewAnnotationsProps) {
  const viewportWidth = useViewportWidth();
  const isMobile = viewportWidth < 768;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {SHOWCASE_CONFIG.annotations.map((annotation, i) => (
        <Annotation
          key={annotation.text}
          text={annotation.text}
          subtext={annotation.subtext}
          position={annotation.position}
          scrollRange={computedRanges[i]}
          scrollYProgress={scrollYProgress}
          isMobile={isMobile}
          isFirst={i === 0}
        />
      ))}
    </div>
  );
}
