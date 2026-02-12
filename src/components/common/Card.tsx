import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/useTheme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'bordered' | 'elevated';
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
}

const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className,
}: CardProps) {
  const { theme } = useTheme();

  const variantClasses = {
    default:
      theme === 'light'
        ? 'bg-white/60 border border-zinc-200/50'
        : 'bg-zinc-900/40 border border-zinc-800/50',
    bordered:
      theme === 'light'
        ? 'bg-white border border-zinc-200 hover:border-zinc-300'
        : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700',
    elevated:
      theme === 'light' ? 'bg-white border border-zinc-200' : 'bg-zinc-900 border border-zinc-800',
  };

  return (
    <div
      className={cn(
        'rounded-2xl transition-colors duration-500',
        paddingMap[padding],
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}
