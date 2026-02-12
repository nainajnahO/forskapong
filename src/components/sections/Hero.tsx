import FramerBackground from '../common/FramerBackground';
import FluidBackground from '../common/FluidBackground';
import StaticNoise from '../common/StaticNoise';
import { EVENT_INFO, HERO_ROTATING_WORDS } from '@/lib/constants';
import Sponsors from './Sponsors';
import Container from '../common/Container';
import { useTheme } from '@/contexts/useTheme';
import { useTypewriter } from '@/hooks/useTypewriter';

export default function Hero() {
  const { backgroundVariant } = useTheme();
  const { displayText } = useTypewriter({ words: HERO_ROTATING_WORDS });

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

      {/* Content Container */}
      <div className="relative z-10 h-screen flex flex-col items-center justify-center px-6 -mt-8 md:mt-0">
        {/* Main Title */}
        <h1 className="text-5xl md:text-[6.5rem] font-display text-white hdr-white-fill uppercase tracking-wider text-center mb-4 px-1">
          {EVENT_INFO.name}
        </h1>

        {/* Typewriter Section */}
        <div className="text-center mb-20">
          <div className="text-2xl md:text-4xl text-white hdr-white-fill flex items-baseline justify-center gap-3">
            <span>Ta med dig</span>
            <span className="font-display text-brand-500 hdr-text-fill">
              {displayText}
              <span className="typewriter-cursor">|</span>
            </span>
          </div>
        </div>

        {/* Bottom Info Bar */}
        <Container className="absolute bottom-40 left-0 right-0">
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
        <div className="absolute bottom-0 left-0 right-0">
          <Sponsors />
        </div>
      </div>
    </div>
  );
}
