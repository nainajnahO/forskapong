import FramerBackground from '../common/FramerBackground';
import FluidBackground from '../common/FluidBackground';
import StaticNoise from '../common/StaticNoise';
import { EVENT_INFO } from '@/lib/constants';
import Sponsors from './Sponsors';
import Container from '../common/Container';
import { useTheme } from '@/contexts/useTheme';
import ParticleOrbCanvas from '../ui/ParticleOrbCanvas';
import type { DivePhase } from '../ui/ParticleOrb';
import LoginForm from './schedule/LoginForm';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function Hero() {
  const { backgroundVariant } = useTheme();
  const [diving, setDiving] = useState(false);
  const [divePhase, setDivePhase] = useState<DivePhase>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const infoBarRef = useRef<HTMLDivElement>(null);
  const orbHitRef = useRef<HTMLDivElement>(null!);
  const glowDivRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef<HTMLDivElement>(null);
  const returnSignalRef = useRef(false);
  const [midpointY, setMidpointY] = useState<number | null>(null);
  const [orbOffsetY, setOrbOffsetY] = useState(0);

  const handleGlowUpdate = useCallback((intensity: number) => {
    const el = glowDivRef.current;
    if (!el) return;
    el.style.opacity = String(intensity);
    el.style.transform = `translate(-50%, -50%) scale(${0.3 + intensity * 0.7})`;
  }, []);

  const handleDivePhase = useCallback((phase: DivePhase) => {
    setDivePhase(phase);
    if (phase === null) {
      returnSignalRef.current = false;
    }
  }, []);

  const dismissDive = useCallback(() => {
    if (divePhase === 'hold') {
      returnSignalRef.current = true;
    }
  }, [divePhase]);

  // Compute midpoint between title and info bar
  useEffect(() => {
    const compute = () => {
      const hero = heroRef.current;
      const title = titleRef.current;
      const info = infoBarRef.current;
      if (!hero || !title || !info) return;

      const heroRect = hero.getBoundingClientRect();
      const titleBottom = title.getBoundingClientRect().bottom - heroRect.top;
      const infoTop = info.getBoundingClientRect().top - heroRect.top;
      const mid = (titleBottom + infoTop) / 2;
      setMidpointY(mid);

      // Convert pixel offset from canvas center to 3D units
      const canvasCenter = heroRect.height / 2;
      const pixelOffset = mid - canvasCenter;
      const fovRad = (40 * Math.PI) / 180;
      const worldHeight = 2 * Math.tan(fovRad / 2) * 9; // cameraZ = 9, fov = 40
      setOrbOffsetY((-pixelOffset / heroRect.height) * worldHeight);
    };

    compute();
    const observer = new ResizeObserver(compute);
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // Escape key to dismiss
  useEffect(() => {
    if (divePhase !== 'hold') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissDive();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [divePhase, dismissDive]);

  return (
    <div ref={heroRef} className="relative w-full min-h-screen overflow-hidden bg-background transition-colors duration-500">
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
        <ParticleOrbCanvas onDiveChange={setDiving} onDivePhase={handleDivePhase} onGlowUpdate={handleGlowUpdate} returnSignalRef={returnSignalRef} eventSource={orbHitRef} orbOffsetY={orbOffsetY} />
      </div>

      {/* Star glow — HDR-enhanced center light, aligned at midpoint between title and info bar */}
      <div
        ref={glowDivRef}
        className="absolute left-1/2 z-20 pointer-events-none"
        style={{ opacity: 0, transform: 'translate(-50%, -50%) scale(0)', width: 400, height: 400, top: midpointY ?? '50%' }}
      >
        {/* Bloom — bright center with exponential falloff */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 5%, rgba(230,235,255,0.3) 15%, rgba(200,210,255,0.12) 30%, rgba(180,195,255,0.04) 50%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
      </div>

      {/* Login form — appears during dive hold phase */}
      {diving && (
        <div
          className="absolute inset-0 z-40"
          onClick={(e) => {
            if (e.target === e.currentTarget) dismissDive();
          }}
        >
          <div
            ref={loginRef}
            className={cn(
              'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 [&>div]:flex [&>div]:flex-col [&>div]:items-center',
              divePhase === 'hold' ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none',
            )}
            style={{ top: midpointY ?? '50%' }}
          >
            <LoginForm theme="dark" side="right" />
          </div>
        </div>
      )}

      {/* Content Container */}
      <div className="relative z-10 h-screen flex flex-col items-center justify-center px-6 -mt-8 md:mt-0">
        {/* Main Title */}
        <h1 ref={titleRef} className={cn(
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
        <div ref={infoBarRef} className={cn(
          'absolute bottom-32 md:bottom-40 left-0 right-0 z-30 pointer-events-none transition-all duration-700',
          diving && 'opacity-0 translate-y-20',
        )}>
        <Container>
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
        </div>

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
