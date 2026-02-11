import { motion } from 'motion/react';
import Container from '../common/Container';
import MediaBetweenText from '../common/MediaBetweenText';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { themeBorder, themeText } from '@/lib/theme-utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AvatarGroup,
  AvatarGroupTooltip,
  AvatarGroupTooltipArrow,
} from '@/components/animate-ui/primitives/animate/avatar-group';

const AVATARS = [
  {
    src: 'https://pbs.twimg.com/profile_images/1948770261848756224/oPwqXMD6_400x400.jpg',
    fallback: 'SK',
    tooltip: 'Skyleen',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1593304942210478080/TUYae5z7_400x400.jpg',
    fallback: 'CN',
    tooltip: 'Shadcn',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1677042510839857154/Kq4tpySA_400x400.jpg',
    fallback: 'AW',
    tooltip: 'Adam Wathan',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1783856060249595904/8TfcCN0r_400x400.jpg',
    fallback: 'GR',
    tooltip: 'Guillermo Rauch',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1534700564810018816/anAuSfkp_400x400.jpg',
    fallback: 'JH',
    tooltip: 'Jhey',
  },
  {
    src: 'https://pbs.twimg.com/profile_images/1927474594102784000/Al0g-I6o_400x400.jpg',
    fallback: 'DH',
    tooltip: 'David Haz',
  },
];

export default function Footer() {
  const { theme } = useTheme();
  return (
    <footer className="bg-background text-foreground transition-colors duration-500">
      {/* Row 1: Hall of Fame */}
      <div className={cn('border-b py-8 transition-colors duration-500', themeBorder(theme))}>
        <Container className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Hall of Fame */}
          <div className="flex items-center gap-6 md:ml-auto">
            <span className={cn('order-2 md:order-1 text-sm font-semibold uppercase tracking-widest transition-colors duration-500', themeText(theme, 'muted'))}>
              Hall of Fame
            </span>
            <AvatarGroup className="order-1 md:order-2 h-12 -space-x-3" invertOverlap>
            {AVATARS.map((avatar, index) => (
              <Avatar key={index} className="size-12 border-3 border-background">
                <AvatarImage src={avatar.src} />
                <AvatarFallback>{avatar.fallback}</AvatarFallback>
                <AvatarGroupTooltip className="bg-primary px-3 py-1.5 text-sm text-primary-foreground rounded-md">
                  <AvatarGroupTooltipArrow className="fill-primary size-2.5" />
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
