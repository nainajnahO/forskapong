import { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import { useIsVisible } from '@/hooks/useIsVisible';
import ParticleOrb from './ParticleOrb';

interface ParticleOrbCanvasProps {
  className?: string;
  onDiveChange?: (diving: boolean) => void;
}

export default function ParticleOrbCanvas({ className, onDiveChange }: ParticleOrbCanvasProps) {
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
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        frameloop={isVisible ? 'always' : 'never'}
        dpr={[1, 3]}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 10], fov: 40 }}
        style={{ background: 'transparent' }}
      >
        <ParticleOrb onDiveChange={handleDiveChange} />
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
