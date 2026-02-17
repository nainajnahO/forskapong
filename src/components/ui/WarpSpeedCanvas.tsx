import { useEffect, useRef } from 'react';
import { WarpSpeed, type WarpSpeedConfig } from '@/lib/warpspeed';
import { cn } from '@/lib/utils';

interface WarpSpeedCanvasProps {
  className?: string;
  speed?: number;
  paused?: boolean;
  config?: WarpSpeedConfig;
}

export default function WarpSpeedCanvas({
  className,
  speed = 0.7,
  paused = false,
  config,
}: WarpSpeedCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<WarpSpeed | null>(null);

  // Create / destroy instance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ws = new WarpSpeed(canvas, config);
    instanceRef.current = ws;
    return () => {
      ws.destroy();
      instanceRef.current = null;
    };
    // Only recreate when config identity changes (caller should memoize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Sync speed
  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.TARGET_SPEED = speed;
    }
  }, [speed]);

  // Sync paused
  useEffect(() => {
    if (!instanceRef.current) return;
    if (paused) {
      instanceRef.current.pause();
    } else {
      instanceRef.current.resume();
    }
  }, [paused]);

  return (
    <div className={cn('pointer-events-none', className)} aria-hidden="true">
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
