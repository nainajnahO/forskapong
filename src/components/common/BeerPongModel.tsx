import { useGLTF } from '@react-three/drei';
import { SHOWCASE_CONFIG } from '@/lib/constants';

export default function BeerPongModel() {
  const { scene } = useGLTF(SHOWCASE_CONFIG.modelPath);

  return <primitive object={scene} />;
}
