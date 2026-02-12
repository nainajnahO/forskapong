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

export default function Footer() {
  const { theme } = useTheme();
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
                  <AvatarImage src={avatar.src} alt={avatar.tooltip} />
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
          {/* Left: Copyright */}
          <div className="flex flex-col gap-2 text-xs text-zinc-500">
            <div>&copy; 2026 Forskåpong. All rights reserved.</div>
          </div>

          {/* Right: Credits */}
          <div className={cn('text-xs transition-colors duration-500', themeText(theme, 'muted'))}>
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
          </div>
        </Container>
      </div>
    </footer>
  );
}
