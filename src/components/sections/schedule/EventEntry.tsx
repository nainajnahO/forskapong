import { cn } from '@/lib/utils'
import { themeText } from '@/lib/theme-utils'
import type { EnrichedEvent } from './types'

interface EventEntryProps {
  ev: EnrichedEvent
  isLast: boolean
  isPast: boolean
  theme: 'light' | 'dark'
  side: 'left' | 'right'
}

export default function EventEntry({ ev, isLast, isPast, theme, side }: EventEntryProps) {
  return (
    <div
      className={cn(
        'w-full pb-1 transition-opacity duration-500',
        isPast && 'opacity-50',
        side === 'left' && 'md:text-right',
      )}
    >
      {/* Time */}
      <p
        className={cn(
          'text-sm tabular-nums mb-0.5 transition-colors duration-500',
          isLast ? 'text-brand-500' : themeText(theme, 'muted'),
        )}
      >
        {ev.time}
      </p>

      {/* Title */}
      <h4
        className={cn(
          'text-xl md:text-2xl font-display transition-colors duration-500',
          themeText(theme, 'primary'),
          ev.bold ? 'font-bold' : 'font-semibold',
          ev.italic ? 'italic' : '',
        )}
      >
        {ev.title}
      </h4>

      {/* Description */}
      <p
        className={cn(
          'text-sm md:text-base leading-relaxed whitespace-pre-wrap mt-1 transition-colors duration-500',
          themeText(theme, 'secondary'),
        )}
      >
        {ev.description}
      </p>

      {/* Speakers */}
      {ev.speakers && ev.speakers.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {ev.speakers.map((speaker, si) => (
            <p key={si} className="transition-colors duration-500">
              <span className="text-sm text-foreground transition-colors duration-500">
                {speaker.name}
              </span>
              <span
                className={cn(
                  'text-sm ml-2 transition-colors duration-500',
                  themeText(theme, 'muted'),
                )}
              >
                {speaker.title}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
