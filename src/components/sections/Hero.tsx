import FramerBackground from '../common/FramerBackground';
import FluidBackground from '../common/FluidBackground';
import StaticNoise from '../common/StaticNoise';
import { EVENT_INFO } from '@/lib/constants';
import Sponsors from './Sponsors';
import Container from '../common/Container';
import { useTheme } from '@/contexts/useTheme';
import ParticleOrbCanvas from '../ui/ParticleOrbCanvas';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function Hero() {
  const { backgroundVariant } = useTheme();
  const [diving, setDiving] = useState(false);
  const orbHitRef = useRef<HTMLDivElement>(null!)

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-background transition-colors duration-500">
      {/* Background - Switch based on background variant */}
      {backgroundVariant === 'framer' ? (
        <div className="absolute inset-0">
          <FramerBackground />
        </div>
      ) : (
        <div className="absolute inset-0">
          <FluidBackground preset="Lava" />
          <StaticNoise opacity={0.3} resolution={450} tileSize={300} />
        </div>
      )}

      {/* Particle Orb — full hero overlay so particles aren't clipped */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <ParticleOrbCanvas onDiveChange={setDiving} eventSource={orbHitRef} />
      </div>

      {/* Content Container */}
      <div className="relative z-10 h-screen flex flex-col items-center justify-center px-6 -mt-8 md:mt-0">
        {/* Main Title */}
        <h1 className={cn(
          'relative z-30 text-5xl md:text-[6.5rem] font-display text-white hdr-white-fill uppercase tracking-wider text-center mb-0 px-1 pointer-events-none transition-all duration-700',
          diving && 'opacity-0 -translate-y-20',
        )}>
          {EVENT_INFO.name}
        </h1>

        {/* Orb interaction area — events are sourced from this element */}
        <div
          ref={orbHitRef}
          className="relative z-30 w-[280px] h-[280px] md:w-[360px] md:h-[360px] my-2"
          style={{ touchAction: 'none' }}
        />

        {/* Bottom Info Bar */}
        <Container className={cn(
          'absolute bottom-32 md:bottom-40 left-0 right-0 z-30 pointer-events-none transition-all duration-700',
          diving && 'opacity-0 translate-y-20',
        )}>
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 max-w-full">
            {/* Date */}
            <span className="text-white hdr-white-fill text-lg md:text-2xl font-light whitespace-nowrap">
              {EVENT_INFO.date}
            </span>

            {/* Divider Line */}
            <div className="w-32 h-0.5 md:w-auto md:flex-1 bg-gradient-to-r from-transparent via-white to-transparent" />

            {/* Location */}
            <span className="text-white hdr-white-fill text-lg md:text-2xl font-light whitespace-nowrap">
              {EVENT_INFO.location}
            </span>
          </div>
        </Container>

        {/* Sponsors Marquee */}
        <div className={cn(
          'absolute bottom-0 left-0 right-0 transition-all duration-700',
          diving && 'opacity-0 translate-y-20',
        )}>
          <Sponsors />
        </div>
      </div>
    </div>
  );
}
