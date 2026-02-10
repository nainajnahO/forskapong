import { ABOUT_CONTENT } from '@/lib/constants';
import Container from '../common/Container';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';

interface AboutProps {
  id?: string;
}

export default function About({ id }: AboutProps) {
  const { theme } = useTheme();
  return (
    <section id={id} className="w-full pt-0 pb-16 md:pb-24">
      <Container>
        {/* Description Text */}
        <div className="space-y-4 mb-16 max-w-3xl">
          <p className={cn('font-sans leading-relaxed text-base transition-colors duration-500', themeText(theme, 'secondary'))}>
            {ABOUT_CONTENT.description1}
          </p>
          <p className={cn('font-sans leading-relaxed text-base transition-colors duration-500', themeText(theme, 'secondary'))}>
            {ABOUT_CONTENT.description2}
          </p>
        </div>

        {/* Full-Width Image Placeholder */}
        <div className={cn(
          'w-full h-96 rounded-2xl border flex items-center justify-center transition-colors duration-500',
          theme === 'light'
            ? 'bg-gradient-to-b from-zinc-100 to-white border-zinc-300'
            : 'bg-gradient-to-b from-zinc-900 to-black border-zinc-800'
        )}>
          <div className="text-center">
            <div className={cn(
              'w-24 h-24 mx-auto mb-4 rounded-lg flex items-center justify-center transition-colors duration-500',
              theme === 'light' ? 'bg-zinc-200' : 'bg-zinc-800'
            )}>
              <svg className={cn('w-12 h-12 transition-colors duration-500', theme === 'light' ? 'text-zinc-400' : 'text-zinc-600')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className={cn('text-sm font-sans transition-colors duration-500', themeText(theme, 'muted'))}>Event Photos Coming Soon</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
