import React, { useRef } from 'react';
import { useIsVisible } from '@/hooks/useIsVisible';

const FramerBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef, { rootMargin: '200px 0px' });

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {isVisible && (
        <iframe
          src="https://incomplete-listening-378233.framer.app"
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
};

export default FramerBackground;
