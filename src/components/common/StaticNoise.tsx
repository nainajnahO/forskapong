import { useEffect, useRef, useState } from 'react';

const DEFAULT_RESOLUTION = 1000; // Canvas resolution (detail level)
const DEFAULT_TILE_SIZE = 500; // Visual tile size
const MAX_RESOLUTION = 10000; // Safety limit

interface StaticNoiseProps {
  /** Canvas resolution (pixels). Higher = finer grain. Default: 1000, Max: 10000 */
  resolution?: number;
  /** Visual tile size (pixels). Controls how large the pattern appears. Default: 500 */
  tileSize?: number;
  /** Opacity of the noise overlay. Default: 0.5 */
  opacity?: number;
}

export default function StaticNoise({
  resolution = DEFAULT_RESOLUTION,
  tileSize = DEFAULT_TILE_SIZE,
  opacity = 0.5,
}: StaticNoiseProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [noiseDataUrl, setNoiseDataUrl] = useState<string>('');

  // Validate props
  const validatedResolution = Math.min(Math.max(resolution, 100), MAX_RESOLUTION);
  const validatedTileSize = Math.max(tileSize, 10);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (resolution)
    canvas.width = validatedResolution;
    canvas.height = validatedResolution;

    // Generate random static pattern
    const imageData = ctx.createImageData(validatedResolution, validatedResolution);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Random value between 0-1
      const random = Math.random();

      // Only two states: fully transparent OR 50% transparent white
      if (random > 0.5) {
        // Fully transparent pixel
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0;
      } else {
        // 50% transparent white pixel
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 128; // 50% transparent
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Update state with the data URL after canvas is painted
    setNoiseDataUrl(canvas.toDataURL());
  }, [validatedResolution]); // Re-generate if resolution changes

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      {noiseDataUrl && (
        <div
          className="absolute inset-0 z-[5] pointer-events-none"
          style={{
            backgroundImage: `url(${noiseDataUrl})`,
            backgroundRepeat: 'repeat',
            backgroundSize: `${validatedTileSize}px ${validatedTileSize}px`,
            mixBlendMode: 'overlay',
            imageRendering: 'pixelated',
            opacity,
          }}
        />
      )}
    </>
  );
}
