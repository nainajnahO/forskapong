import { type ComponentPropsWithoutRef, useCallback, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

interface ParticlesProps extends ComponentPropsWithoutRef<'div'> {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
  paused?: boolean;
  warp?: boolean;
  onWarpComplete?: () => void;
}

function hexToRgb(hex: string): number[] {
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  const hexInt = parseInt(hex, 16);
  return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255];
}

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
};

const WARP_DURATION = 2500;
const WARP_RAMP_UP = 1000;
const WARP_HOLD_END = 1500;
const WARP_MAX_PUSH = 6;

function getWarpPush(elapsed: number): number {
  if (elapsed < WARP_RAMP_UP) {
    const t = elapsed / WARP_RAMP_UP;
    return t * t * WARP_MAX_PUSH;
  } else if (elapsed < WARP_HOLD_END) {
    return WARP_MAX_PUSH;
  } else if (elapsed < WARP_DURATION) {
    const t = (elapsed - WARP_HOLD_END) / (WARP_DURATION - WARP_HOLD_END);
    return (1 - t * t) * WARP_MAX_PUSH;
  }
  return 0;
}

export default function Particles({
  className = '',
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = '#ffffff',
  vx = 0,
  vy = 0,
  paused = false,
  warp = false,
  onWarpComplete,
  ...props
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<Circle[]>([]);
  const mouse = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasSize = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;
  const rafID = useRef<number | null>(null);
  const resizeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warpStartRef = useRef<number>(0);
  const warpActiveRef = useRef(false);
  const onWarpCompleteRef = useRef(onWarpComplete);
  onWarpCompleteRef.current = onWarpComplete;

  const rgb = hexToRgb(color);

  // Ref-based mouse tracking — zero re-renders
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const { w, h } = canvasSize.current;
      const x = event.clientX - rect.left - w / 2;
      const y = event.clientY - rect.top - h / 2;
      const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
      if (inside) {
        mouse.current.x = x;
        mouse.current.y = y;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const circleParams = useCallback((): Circle => {
    const x = Math.floor(Math.random() * canvasSize.current.w);
    const y = Math.floor(Math.random() * canvasSize.current.h);
    const pSize = Math.floor(Math.random() * 2) + size;
    const alpha = 0;
    const targetAlpha = parseFloat((Math.random() * 0.6 + 0.1).toFixed(1));
    const dx = (Math.random() - 0.5) * 0.1;
    const dy = (Math.random() - 0.5) * 0.1;
    const magnetism = 0.1 + Math.random() * 4;
    return {
      x,
      y,
      translateX: 0,
      translateY: 0,
      size: pSize,
      alpha,
      targetAlpha,
      dx,
      dy,
      magnetism,
    };
  }, [size]);

  const drawCircle = useCallback(
    (circle: Circle, update = false) => {
      if (context.current) {
        const { x, y, translateX, translateY, size: s, alpha } = circle;
        context.current.translate(translateX, translateY);
        context.current.beginPath();
        context.current.arc(x, y, s, 0, 2 * Math.PI);
        context.current.fillStyle = `rgba(${rgb.join(', ')}, ${alpha})`;
        context.current.fill();
        context.current.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (!update) circles.current.push(circle);
      }
    },
    [rgb, dpr],
  );

  const clearContext = useCallback(() => {
    if (context.current) {
      context.current.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h);
    }
  }, []);

  const resizeCanvas = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current && context.current) {
      canvasSize.current.w = canvasContainerRef.current.offsetWidth;
      canvasSize.current.h = canvasContainerRef.current.offsetHeight;

      canvasRef.current.width = canvasSize.current.w * dpr;
      canvasRef.current.height = canvasSize.current.h * dpr;
      canvasRef.current.style.width = `${canvasSize.current.w}px`;
      canvasRef.current.style.height = `${canvasSize.current.h}px`;
      context.current.scale(dpr, dpr);

      circles.current = [];
      for (let i = 0; i < quantity; i++) {
        const circle = circleParams();
        drawCircle(circle);
      }
    }
  }, [dpr, quantity, circleParams, drawCircle]);

  const drawParticles = useCallback(() => {
    clearContext();
    for (let i = 0; i < quantity; i++) {
      const circle = circleParams();
      drawCircle(circle);
    }
  }, [clearContext, quantity, circleParams, drawCircle]);

  const initCanvas = useCallback(() => {
    resizeCanvas();
    drawParticles();
  }, [resizeCanvas, drawParticles]);

  const remapValue = (
    value: number,
    start1: number,
    end1: number,
    start2: number,
    end2: number,
  ): number => {
    const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
    return remapped > 0 ? remapped : 0;
  };

  const animateRef = useRef<() => void>(() => {});

  const animate = useCallback(() => {
    clearContext();
    // Reverse iteration so splice doesn't skip elements
    for (let i = circles.current.length - 1; i >= 0; i--) {
      const circle = circles.current[i];
      const edge = [
        circle.x + circle.translateX - circle.size,
        canvasSize.current.w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        canvasSize.current.h - circle.y - circle.translateY - circle.size,
      ];
      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = parseFloat(remapValue(closestEdge, 0, 20, 0, 1).toFixed(2));
      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) {
          circle.alpha = circle.targetAlpha;
        }
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }
      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;
      circle.translateX +=
        (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) / ease;
      circle.translateY +=
        (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) / ease;

      // Warp: radial push from center
      if (warpActiveRef.current) {
        const elapsed = performance.now() - warpStartRef.current;
        const push = getWarpPush(elapsed);
        const cx = canvasSize.current.w / 2;
        const cy = canvasSize.current.h / 2;
        const dx = circle.x - cx;
        const dy = circle.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        circle.x += (dx / dist) * push;
        circle.y += (dy / dist) * push;

        if (elapsed >= WARP_DURATION) {
          warpActiveRef.current = false;
          onWarpCompleteRef.current?.();
        }
      }

      drawCircle(circle, true);

      if (
        circle.x < -circle.size ||
        circle.x > canvasSize.current.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > canvasSize.current.h + circle.size
      ) {
        circles.current.splice(i, 1);
        const newCircle = circleParams();
        // During warp, respawn near center so particles stream outward
        if (warpActiveRef.current) {
          newCircle.x = canvasSize.current.w / 2 + (Math.random() - 0.5) * 30;
          newCircle.y = canvasSize.current.h / 2 + (Math.random() - 0.5) * 30;
        }
        drawCircle(newCircle);
      }
    }
    rafID.current = window.requestAnimationFrame(animateRef.current);
  }, [clearContext, drawCircle, circleParams, vx, vy, staticity, ease]);

  useEffect(() => {
    animateRef.current = animate;
  }, [animate]);

  // Init canvas and handle resize
  useEffect(() => {
    if (canvasRef.current) {
      context.current = canvasRef.current.getContext('2d');
    }
    initCanvas();

    const handleResize = () => {
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      resizeTimeout.current = setTimeout(() => initCanvas(), 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (rafID.current != null) window.cancelAnimationFrame(rafID.current);
      if (resizeTimeout.current) clearTimeout(resizeTimeout.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [initCanvas]);

  useEffect(() => {
    initCanvas();
  }, [refresh, initCanvas]);

  // Start warp burst when prop transitions to true
  useEffect(() => {
    if (warp) {
      warpStartRef.current = performance.now();
      warpActiveRef.current = true;
    }
  }, [warp]);

  // Start/stop animation based on paused prop
  useEffect(() => {
    if (paused) {
      if (rafID.current != null) {
        window.cancelAnimationFrame(rafID.current);
        rafID.current = null;
      }
    } else {
      // Only start if not already running
      if (rafID.current == null) {
        animate();
      }
    }
    return () => {
      if (rafID.current != null) {
        window.cancelAnimationFrame(rafID.current);
        rafID.current = null;
      }
    };
  }, [paused, animate]);

  return (
    <div
      className={cn('pointer-events-none', className)}
      ref={canvasContainerRef}
      aria-hidden="true"
      {...props}
    >
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
}
