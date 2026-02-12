import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import Container from '../common/Container';
import MediaBetweenText from '../common/MediaBetweenText';
import { useTheme } from '@/contexts/useTheme';
import { cn } from '@/lib/utils';
import { themeBorder, themeText } from '@/lib/theme-utils';
import { HALL_OF_FAME_AVATARS } from '@/lib/constants';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AvatarGroup,
  AvatarGroupTooltip,
  AvatarGroupTooltipArrow,
} from '@/components/animate-ui/primitives/animate/avatar-group';

type Status = 'on' | 'off' | 'unsupported';

interface CapItem {
  label: string;
  status: Status;
}

function useCapabilities(): Record<string, boolean | null> {
  const [caps, setCaps] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const webgl2Ctx = canvas.getContext('webgl2');
    const webglCtx = webgl2Ctx || canvas.getContext('webgl');

    setCaps({
      hdr: window.matchMedia('(dynamic-range: high)').matches || null,
      p3: window.matchMedia('(color-gamut: p3)').matches || null,
      webgl: !!webglCtx || null,
      webgl2: !!webgl2Ctx || null,
      highDpr: window.devicePixelRatio > 1 || null,
    });
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
      { label: 'HDR', status: caps.hdr ? 'on' : caps.hdr === false ? 'unsupported' : 'off' },
      { label: 'P3 Gamut', status: caps.p3 ? 'on' : caps.p3 === false ? 'unsupported' : 'off' },
      { label: 'GPU Accel', status: caps.webgl ? 'on' : caps.webgl === false ? 'unsupported' : 'off' },
      { label: 'WebGL 2', status: caps.webgl2 ? 'on' : caps.webgl2 === false ? 'unsupported' : 'off' },
      { label: 'Retina', status: caps.highDpr ? 'on' : caps.highDpr === false ? 'unsupported' : 'off' },
      { label: 'Fluid BG', status: backgroundVariant === 'fluid' ? 'on' : 'off' },
    ],
    [caps, backgroundVariant],
  );
  return (
    <footer className="bg-background text-foreground transition-colors duration-500">
      {/* Row 1: Hall of Fame */}
      <div className={cn('border-b py-8 transition-colors duration-500', themeBorder(theme))}>
        <Container className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Hall of Fame */}
          <div className="flex items-center gap-6 md:ml-auto">
            <span
              className={cn(
                'order-2 md:order-1 text-sm font-semibold uppercase tracking-widest transition-colors duration-500',
                themeText(theme, 'muted'),
              )}
            >
              Hall of Fame
            </span>
            <AvatarGroup className="order-1 md:order-2 h-12 -space-x-3" invertOverlap>
              {HALL_OF_FAME_AVATARS.map((avatar) => (
                <Avatar key={avatar.tooltip} className="size-12 border-3 border-background">
                  <AvatarImage src={avatar.src} alt={avatar.tooltip} className="scale-150 object-cover object-top" />
                  <AvatarFallback>{avatar.fallback}</AvatarFallback>
                  <AvatarGroupTooltip className="bg-brand-500 px-3 py-1.5 text-sm text-white rounded-md">
                    <AvatarGroupTooltipArrow className="fill-brand-500 size-2.5" />
                    <motion.p layout="preserve-aspect">{avatar.tooltip}</motion.p>
                  </AvatarGroupTooltip>
                </Avatar>
              ))}
            </AvatarGroup>
          </div>
        </Container>
      </div>

      {/* Row 2: Copyright and Credits */}
      <div className="py-8">
        <Container className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Left: Copyright + Debug HUD */}
          <div className="flex flex-col gap-3 text-xs text-zinc-500">
            <div>&copy; 2026 Forskåpong. All rights reserved.</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] tracking-wide text-zinc-600">
              {items.map((item) => (
                <span key={item.label} className="flex items-center gap-1">
                  <StatusDot status={item.status} />
                  {item.label}: {statusLabel(item.status)}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Credits + GitHub */}
          <div className={cn('flex flex-col items-end gap-3 text-xs transition-colors duration-500', themeText(theme, 'muted'))}>
            <MediaBetweenText
              firstText="Made with "
              secondText=" by Forskå"
              mediaUrl="https://images.unsplash.com/photo-1574096079513-d8259312b785?w=200&h=80&fit=crop"
              mediaType="image"
              alt="Beer pong celebration"
              className="items-center justify-center gap-1"
              leftTextClassName={themeText(theme, 'muted')}
              rightTextClassName={themeText(theme, 'muted')}
              mediaContainerClassName="h-5 rounded overflow-hidden"
            />
            <a
              href="https://github.com/nainajnahO/forskapong"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </div>
        </Container>
      </div>
    </footer>
  );
}
