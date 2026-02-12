import { useRef } from 'react';
import { useScroll, useMotionValueEvent } from 'motion/react';

export function useExplodedViewScroll(containerRef: React.RefObject<HTMLElement | null>) {
  const progressRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = v;
  });

  return { progressRef, scrollYProgress };
}
