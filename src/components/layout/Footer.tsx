import { useEffect, useMemo, useState } from 'react';
import Container from '../common/Container';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';

type Status = 'on' | 'off' | 'unsupported';

interface CapItem {
  label: string;
  status: Status;
}

function detectCapabilities(): Record<string, boolean> {
  const canvas = document.createElement('canvas');
  const webgl2Ctx = canvas.getContext('webgl2');
  const webglCtx = webgl2Ctx || canvas.getContext('webgl');

  return {
    hdr: window.matchMedia('(dynamic-range: high)').matches,
    p3: window.matchMedia('(color-gamut: p3)').matches,
    webgl: !!webglCtx,
    webgl2: !!webgl2Ctx,
    highDpr: window.devicePixelRatio > 1,
  };
}

function useCapabilities(): Record<string, boolean> {
  const [caps, setCaps] = useState(detectCapabilities);

  useEffect(() => {
    const hdrMql = window.matchMedia('(dynamic-range: high)');
    const p3Mql = window.matchMedia('(color-gamut: p3)');

    const update = () => {
      const hdr = hdrMql.matches;
      const p3 = p3Mql.matches;
      setCaps((prev) => {
        if (prev.hdr === hdr && prev.p3 === p3) return prev;
        return { ...prev, hdr, p3 };
      });
    };

    // Instant update when the browser fires the event (Chrome, Firefox)
    hdrMql.addEventListener('change', update);
    p3Mql.addEventListener('change', update);

    // Polling fallback: Safari doesn't fire change events for capability
    // media queries toggled via developer settings
    const interval = setInterval(update, 2000);

    return () => {
      hdrMql.removeEventListener('change', update);
      p3Mql.removeEventListener('change', update);
      clearInterval(interval);
    };
  }, []);

  return caps;
}

function StatusDot({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'inline-block size-1.5 rounded-full',
        status === 'on' && 'bg-emerald-400',
        status === 'off' && 'bg-yellow-500',
        status === 'unsupported' && 'bg-red-500',
      )}
    />
  );
}

function statusLabel(s: Status) {
  if (s === 'on') return 'ON';
  if (s === 'off') return 'OFF';
  return 'N/A';
}

export default function Footer() {
  const { theme, backgroundVariant } = useTheme();
  const caps = useCapabilities();

  const items: CapItem[] = useMemo(
    () => [
      { label: 'HDR', status: caps.hdr ? 'on' : 'off' },
      { label: 'P3 Gamut', status: caps.p3 ? 'on' : 'off' },
      { label: 'GPU Accel', status: caps.webgl ? 'on' : 'off' },
      { label: 'WebGL 2', status: caps.webgl2 ? 'on' : 'off' },
      { label: 'Retina', status: caps.highDpr ? 'on' : 'off' },
      { label: 'Fluid BG', status: backgroundVariant === 'fluid' ? 'on' : 'off' },
    ],
    [caps, backgroundVariant],
  );
  return (
    <footer className="bg-background text-foreground transition-colors duration-500">
      <div className="py-8">
        <Container className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left: Copyright + Debug HUD */}
          <div className="flex flex-col gap-3 text-xs text-zinc-500">
            <div>&copy; 2026 TentaFestivalen Beerpong. All rights reserved.</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] tracking-wide text-zinc-600">
              {items.map((item) => (
                <span key={item.label} className="flex items-center gap-1">
                  <StatusDot status={item.status} />
                  {item.label}: {statusLabel(item.status)}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Credits */}
          <div className={cn('flex flex-col items-start md:items-end gap-3 text-xs transition-colors duration-500', themeText(theme, 'muted'))}>
            <span>Made by BK</span>
          </div>
        </Container>
      </div>
    </footer>
  );
}
