import FramerBackground from '../common/FramerBackground';
import FluidBackground from '../common/FluidBackground';
import StaticNoise from '../common/StaticNoise';
import RotatingCube from '@/components/common/RotatingCube';
import { EVENT_INFO, HERO_ROTATING_WORDS } from '@/lib/constants';
import Container from '../common/Container';
import { useTheme } from '@/contexts/ThemeContext';
import { useAutoRotateCube } from '@/hooks/useAutoRotateCube';
import useScreenSize from '@/hooks/useScreenSize';

export default function Hero() {
  const { backgroundVariant } = useTheme();
  const screenSize = useScreenSize();
  const cubeSize = screenSize.lessThan('md') ? 80 : 120;
  const { cubeRef, setIsDragging } = useAutoRotateCube(HERO_ROTATING_WORDS);

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
      <div className="relative z-10 h-screen flex flex-col items-center justify-center px-6">
        {/* Main Title */}
        <h1 className="text-5xl md:text-[6.5rem] font-display text-white uppercase tracking-wider text-center mb-4 px-1">
          {EVENT_INFO.name}
        </h1>

        {/* Rotating Cube Section */}
        <div className="text-center mb-20">
          <div className="text-2xl md:text-4xl text-white flex items-center justify-center gap-3">
            <span>Ta med dig</span>
            <RotatingCube
              ref={cubeRef}
              words={HERO_ROTATING_WORDS}
              className="font-display text-red-500"
              size={cubeSize}
              draggable={true}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
            />
          </div>
        </div>

        {/* Bottom Info Bar */}
        <Container className="absolute bottom-20 left-0 right-0">
          <div className="flex items-center gap-6 max-w-full">
            {/* Left: Date */}
            <span className="text-white text-lg md:text-2xl font-light whitespace-nowrap">
              {EVENT_INFO.date}
            </span>

            {/* Center: Divider Line */}
            <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent" />

            {/* Right: Location */}
            <span className="text-white text-lg md:text-2xl font-light whitespace-nowrap">
              {EVENT_INFO.location}
            </span>
          </div>
        </Container>
      </div>
    </div>
  );
}
