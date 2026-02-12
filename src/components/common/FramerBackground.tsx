import { useRef } from 'react';
import { useIsVisible } from '@/hooks/useIsVisible';
import { FRAMER_BACKGROUND_URL } from '@/lib/constants';

export default function FramerBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef, { rootMargin: '200px 0px' });

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {isVisible && (
        <iframe
          src={FRAMER_BACKGROUND_URL}
          className="absolute"
          style={{
            border: 'none',
            width: '120%',
            height: '125%',
            top: '0%',
            left: '0%',
          }}
          title="Background Animation"
          loading="lazy"
          allowFullScreen
          aria-hidden="true"
        />
      )}
    </div>
  );
}
