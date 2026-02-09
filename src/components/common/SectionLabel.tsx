import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { themeLine } from '@/lib/theme-utils';

interface SectionLabelProps {
  children: React.ReactNode;
  variant?: 'default' | 'gradient';
  className?: string;
}

export default function SectionLabel({ children, variant = 'default', className }: SectionLabelProps) {
  const { theme } = useTheme();

  if (variant === 'gradient') {
    return (
      <div className={cn('flex items-center gap-4 mb-12', className)}>
        <div className="flex-1 h-px bg-gradient-to-r from-red-600 to-transparent" />
        <h2 className="text-sm font-semibold tracking-widest text-red-600 whitespace-nowrap">
          {children}
        </h2>
        <div className="flex-1 h-px bg-gradient-to-l from-red-600 to-transparent" />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-4 mb-12', className)}>
      <div className={cn('w-10 h-px transition-colors duration-500', themeLine(theme))} />
      <span className="text-sm text-foreground font-sans tracking-wide transition-colors duration-500">
        {children}
      </span>
    </div>
  );
}
