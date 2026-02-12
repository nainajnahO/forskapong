import { motion, AnimatePresence } from 'motion/react';
import Container from '@/components/common/Container';
import { cn } from '@/lib/utils';
import EventEntry from './EventEntry';
import type { EnrichedEvent } from './types';

interface ScheduleTimelineProps {
  contentRef: React.RefObject<HTMLDivElement | null>;
  translateY: number;
  visibleEvents: EnrichedEvent[];
  theme: 'light' | 'dark';
}

export default function ScheduleTimeline({
  contentRef,
  translateY,
  visibleEvents,
  theme,
}: ScheduleTimelineProps) {
  return (
    <div className="flex-1 min-h-0">
      <Container className="h-full overflow-hidden">
        <motion.div
          ref={contentRef}
          className="max-w-4xl mx-auto"
          animate={{ y: translateY }}
          transition={{ type: 'spring', stiffness: 300, damping: 40 }}
        >
          <div className="relative">
            <AnimatePresence initial={false}>
              {visibleEvents.map((ev, i) => {
                const isLeft = i % 2 === 0;
                const isLast = i === visibleEvents.length - 1;
                const isPast = !isLast;
                const isPhaseStart = i === 0 || ev.phase !== visibleEvents[i - 1].phase;

                return (
                  <motion.div
                    key={`${ev.phase}-${ev.title}`}
                    initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    {/* Phase badge on spine */}
                    {isPhaseStart && (
                      <div className="flex items-center mb-3">
                        <div className="md:hidden flex items-center">
                          <div className="w-8 flex justify-center">
                            <span
                              className={cn(
                                'inline-block rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-medium',
                                theme === 'light'
                                  ? 'bg-zinc-100 border border-zinc-300 text-zinc-600'
                                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400',
                              )}
                            >
                              {ev.phase}
                            </span>
                          </div>
                        </div>
                        <div className="hidden md:flex w-full justify-center">
                          <span
                            className={cn(
                              'inline-block rounded-full px-3 py-1 text-xs uppercase tracking-widest font-medium',
                              theme === 'light'
                                ? 'bg-zinc-100 border border-zinc-300 text-zinc-600'
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-400',
                            )}
                          >
                            {ev.phase}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Event row */}
                    <div
                      className={cn(
                        'mb-6',
                        'grid grid-cols-[32px_1fr] md:grid-cols-[1fr_48px_1fr]',
                      )}
                    >
                      {/* Desktop left column */}
                      <div className="hidden md:flex items-start justify-end">
                        {isLeft ? (
                          <EventEntry
                            ev={ev}
                            isLast={isLast}
                            isPast={isPast}
                            theme={theme}
                            side="left"
                          />
                        ) : (
                          <div />
                        )}
                      </div>

                      {/* Desktop spine column */}
                      <div className="hidden md:flex flex-col items-center relative">
                        <div className="flex items-center h-6 w-full">
                          <div
                            className={cn(
                              'h-px flex-1',
                              isLeft
                                ? isPast
                                  ? theme === 'light'
                                    ? 'bg-zinc-300'
                                    : 'bg-zinc-700'
                                  : 'bg-brand-500/50'
                                : 'bg-transparent',
                            )}
                          />
                          {isLast ? (
                            <div className="relative flex items-center justify-center">
                              <span className="absolute w-8 h-8 rounded-full bg-brand-500/20 animate-ping" />
                              <span className="relative w-4 h-4 rounded-full bg-brand-500 border-2 border-brand-500/30" />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'w-3 h-3 rounded-full border-2 shrink-0',
                                theme === 'light'
                                  ? 'bg-zinc-400 border-zinc-200'
                                  : 'bg-zinc-600 border-zinc-900',
                              )}
                            />
                          )}
                          <div
                            className={cn(
                              'h-px flex-1',
                              !isLeft
                                ? isPast
                                  ? theme === 'light'
                                    ? 'bg-zinc-300'
                                    : 'bg-zinc-700'
                                  : 'bg-brand-500/50'
                                : 'bg-transparent',
                            )}
                          />
                        </div>
                        <div
                          className={cn(
                            'w-px flex-1',
                            isLast
                              ? 'border-l border-dashed' +
                                  (theme === 'light' ? ' border-zinc-300' : ' border-zinc-800')
                              : theme === 'light'
                                ? 'bg-zinc-300'
                                : 'bg-zinc-700',
                          )}
                        />
                      </div>

                      {/* Desktop right column */}
                      <div className="hidden md:flex items-start">
                        {!isLeft ? (
                          <EventEntry
                            ev={ev}
                            isLast={isLast}
                            isPast={isPast}
                            theme={theme}
                            side="right"
                          />
                        ) : (
                          <div />
                        )}
                      </div>

                      {/* Mobile spine column */}
                      <div className="md:hidden flex flex-col items-center relative">
                        <div className="flex items-center h-5">
                          {isLast ? (
                            <div className="relative flex items-center justify-center">
                              <span className="absolute w-6 h-6 rounded-full bg-brand-500/20 animate-ping" />
                              <span className="relative w-3 h-3 rounded-full bg-brand-500 border-2 border-brand-500/30" />
                            </div>
                          ) : (
                            <div
                              className={cn(
                                'w-2.5 h-2.5 rounded-full border-2 shrink-0',
                                theme === 'light'
                                  ? 'bg-zinc-400 border-zinc-200'
                                  : 'bg-zinc-600 border-zinc-900',
                              )}
                            />
                          )}
                        </div>
                        <div
                          className={cn(
                            'w-px flex-1',
                            isLast
                              ? 'border-l border-dashed' +
                                  (theme === 'light' ? ' border-zinc-300' : ' border-zinc-800')
                              : theme === 'light'
                                ? 'bg-zinc-300'
                                : 'bg-zinc-700',
                          )}
                        />
                      </div>

                      {/* Mobile card column */}
                      <div className="md:hidden pl-3">
                        <EventEntry
                          ev={ev}
                          isLast={isLast}
                          isPast={isPast}
                          theme={theme}
                          side="right"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
