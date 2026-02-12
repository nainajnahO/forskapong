import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, Environment } from '@react-three/drei';
import BeerPongModel from '@/components/common/BeerPongModel';
import CameraRig from '@/components/common/CameraRig';

interface ExplodedViewCanvasProps {
  scrollProgress: React.RefObject<number>;
  isVisible: boolean;
}

export default function ExplodedViewCanvas({ scrollProgress, isVisible }: ExplodedViewCanvasProps) {
  return (
    <Canvas
      frameloop={isVisible ? 'always' : 'never'}
      dpr={[1, 3]}
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [2, 2, 4], fov: 45 }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={2} />
      <directionalLight position={[-3, 4, -5]} intensity={1} />
      <Environment preset="city" />
      <BeerPongModel />
      <CameraRig scrollProgress={scrollProgress} />
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
    </Canvas>
  );
}
