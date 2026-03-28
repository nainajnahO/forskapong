import { useRef, useState, useCallback, type RefObject } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { useIsVisible } from '@/hooks/useIsVisible';
import ParticleOrb, { type DivePhase } from './ParticleOrb';

interface ParticleOrbCanvasProps {
  className?: string;
  onDiveChange?: (diving: boolean) => void;
  onDivePhase?: (phase: DivePhase) => void;
  onGlowUpdate?: (intensity: number) => void;
  returnSignalRef?: RefObject<boolean>;
  eventSource?: RefObject<HTMLElement>;
}

export default function ParticleOrbCanvas({ className, onDiveChange, onDivePhase, onGlowUpdate, returnSignalRef, eventSource }: ParticleOrbCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef);
  const [diving, setDiving] = useState(false);

  const handleDiveChange = useCallback(
    (isDiving: boolean) => {
      setDiving(isDiving);
      onDiveChange?.(isDiving);
    },
    [onDiveChange],
  );

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
      <Canvas
        frameloop={isVisible ? 'always' : 'never'}
        dpr={[1, 3]}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 9], fov: 40 }}
        style={{ background: 'transparent', pointerEvents: 'none' }}
        eventSource={eventSource}
        eventPrefix="client"
      >
        <ParticleOrb onDiveChange={handleDiveChange} onDivePhase={onDivePhase} onGlowUpdate={onGlowUpdate} returnSignalRef={returnSignalRef} />
        <OrbitControls
          enabled={!diving}
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.5}
        />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
      </Canvas>
    </div>
  );
}
