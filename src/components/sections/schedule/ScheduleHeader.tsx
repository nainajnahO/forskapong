import Container from '@/components/common/Container';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';

interface ScheduleHeaderProps {
  clockText: string;
  currentPhase: string;
  theme: 'light' | 'dark';
}

export default function ScheduleHeader({ clockText, currentPhase, theme }: ScheduleHeaderProps) {
  return (
    <Container className="pt-[5.5rem]">
      {/* Big clock */}
      <div className="text-center mb-2">
        <span
          className={cn(
            'text-6xl md:text-8xl lg:text-9xl font-display tabular-nums hdr-white-fill transition-colors duration-500',
            themeText(theme, 'primary'),
          )}
        >
          {clockText}
        </span>
      </div>

      {/* Current phase label with lines */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div
          className={cn(
            'h-px w-12 md:w-20 transition-colors duration-500',
            theme === 'light' ? 'bg-zinc-300' : 'bg-zinc-700',
          )}
        />
        <span className="text-xs uppercase tracking-widest text-brand-500 font-medium">
          {currentPhase}
        </span>
        <div
          className={cn(
            'h-px w-12 md:w-20 transition-colors duration-500',
            theme === 'light' ? 'bg-zinc-300' : 'bg-zinc-700',
          )}
        />
      </div>
    </Container>
  );
}
