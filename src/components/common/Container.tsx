import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'wide' | 'full';
}

export default function Container({ children, className, size = 'default' }: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto px-6 md:px-12',
        {
          'max-w-7xl': size === 'default',
          'max-w-[1400px]': size === 'wide',
          'max-w-none': size === 'full',
        },
        className
      )}
    >
      {children}
    </div>
  );
}
