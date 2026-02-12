import { useRef } from 'react';
import { useScroll } from 'motion/react';
import VenueMapCanvas from '@/components/common/VenueMapCanvas';
import VenueMapAnnotations from '@/components/common/VenueMapAnnotations';
import { VENUE_MAP_CONFIG } from '@/lib/constants';
import { useIsVisible } from '@/hooks/useIsVisible';

interface VenueMapProps {
  id?: string;
}

export default function VenueMap({ id }: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      ref={containerRef}
      id={id}
      style={{ height: `${VENUE_MAP_CONFIG.scrollPages * 100}vh`, touchAction: 'pan-y' }}
      className="relative"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <VenueMapCanvas scrollYProgress={scrollYProgress} isVisible={isVisible} />
        <VenueMapAnnotations scrollYProgress={scrollYProgress} />
      </div>
    </section>
  );
}
