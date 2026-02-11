import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  label?: string;
  title: string;
  titleHighlight?: string;
  highlightClassName?: string;
  subtitle?: string;
  className?: string;
}

export default function SectionHeader({
  title,
  titleHighlight,
  highlightClassName = 'italic text-brand-400',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('mb-16', className)}>
      <h1 className="text-4xl md:text-6xl font-display text-foreground transition-colors duration-500">
        {title}{' '}
        {titleHighlight && (
          <span className={highlightClassName}>{titleHighlight}</span>
        )}
      </h1>
    </div>
  );
}
