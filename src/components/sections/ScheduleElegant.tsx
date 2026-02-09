import { SCHEDULE_PHASES } from '@/lib/constants';
import Container from '../common/Container';
import type { ScheduleEvent } from '@/types';
import { useEffect, useState, useRef } from 'react';
import ballImage from '@/assets/ball.webp';
import cupImage from '@/assets/cup.webp';
import { useTheme } from '@/contexts/ThemeContext';

interface ScheduleElegantProps {
  id?: string;
}

export default function ScheduleElegant({ id }: ScheduleElegantProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const cupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!timelineRef.current || !cupRef.current) return;

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const cupRect = cupRef.current.getBoundingClientRect();
      const centerY = window.innerHeight / 2;

      // Show ball from when timeline starts until ball reaches center of cup
      const cupCenter = cupRect.top + (cupRect.height / 2);
      const isInRange = timelineRect.top <= centerY && cupCenter >= centerY;
      setIsVisible(isInRange);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id={id} className="w-full py-16 md:py-24 bg-background relative overflow-hidden transition-colors duration-500">
      <Container>
        {/* Section heading */}
        <div className="mb-20 relative z-10">
          {/* Section label */}
          <div className="flex items-center gap-4 mb-8">
            <div className={`h-px w-10 transition-colors duration-500 ${theme === 'light' ? 'bg-gray-900' : 'bg-white'}`}></div>
            <h2 className="text-sm md:text-base font-semibold tracking-wider text-foreground uppercase transition-colors duration-500">
              Körschema
            </h2>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl font-bold text-foreground font-display transition-colors duration-500">
            Vad <span className="italic text-red-400">Händish?</span>
          </h1>

          <div className="flex items-center gap-2 mt-6">
            <div className={`h-px w-16 transition-colors duration-500 ${theme === 'light' ? 'bg-gradient-to-r from-transparent via-zinc-300 to-transparent' : 'bg-gradient-to-r from-transparent via-zinc-700 to-transparent'}`}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
            <div className={`h-px w-16 transition-colors duration-500 ${theme === 'light' ? 'bg-gradient-to-r from-transparent via-zinc-300 to-transparent' : 'bg-gradient-to-r from-transparent via-zinc-700 to-transparent'}`}></div>
          </div>
        </div>

        {/* Fixed Ball - centered on screen, only visible in this section */}
        {isVisible && (
          <div className="hidden md:block fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <img
              src={ballImage}
              alt="Beer pong ball"
              className="w-16 h-16 object-contain drop-shadow-lg"
            />
          </div>
        )}

        {/* Vertical timeline */}
        <div ref={timelineRef} className="relative max-w-4xl mx-auto">
          {/* Central timeline line */}
          <div className={`absolute left-8 md:left-1/2 top-0 bottom-0 w-px hidden md:block transition-colors duration-500 ${theme === 'light' ? 'bg-gradient-to-b from-red-500/30 via-zinc-300/50 to-red-500/30' : 'bg-gradient-to-b from-red-500/30 via-zinc-700/50 to-red-500/30'}`}></div>

          {/* Timeline events */}
          <div className="space-y-16">
            {SCHEDULE_PHASES.map((phase, phaseIndex) => (
              <div key={phaseIndex} className="relative">
                {/* Phase content */}
                <div className={`relative ${
                  phaseIndex % 2 === 0 ? 'md:pr-[52%]' : 'md:pl-[52%]'
                }`}>
                  <div>
                    {/* Phase title - centered above cards */}
                    <div className="text-center mb-8">
                      <h3 className="text-2xl md:text-3xl text-foreground font-display font-bold inline-block transition-colors duration-500">
                        {phase.name}
                        <span className="ml-4 text-red-400 font-semibold tabular-nums">
                          {phase.startTime}
                        </span>
                      </h3>
                    </div>

                    {/* Events */}
                    <div className="space-y-6">
                      {phase.events.map((event: ScheduleEvent, eventIndex) => (
                        <div
                          key={eventIndex}
                          className={`group backdrop-blur-sm rounded-lg p-6 transition-all duration-500 shadow-lg ${
                            theme === 'light'
                              ? 'bg-white/60 border border-zinc-200/50 hover:bg-white/80 hover:border-red-200/50 hover:shadow-red-200/20'
                              : 'bg-zinc-900/40 border border-zinc-800/50 hover:bg-zinc-900/60 hover:border-red-900/50 hover:shadow-red-900/20'
                          }`}
                        >
                          {/* Time */}
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-2 h-2 rounded-full bg-red-500/50 group-hover:bg-red-500 transition-colors"></div>
                            <p className={`text-sm tabular-nums transition-colors duration-500 ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-500'}`}>
                              {event.time}
                            </p>
                          </div>

                          {/* Event title */}
                          <h4 className={`text-xl md:text-2xl mb-2 text-foreground font-display transition-colors duration-500 ${
                            event.bold ? 'font-bold' : 'font-semibold'
                          } ${event.italic ? 'italic' : ''}`}>
                            {event.title}
                          </h4>

                          {/* Description */}
                          <p className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap transition-colors duration-500 ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-400'}`}>
                            {event.description}
                          </p>

                          {/* Speakers */}
                          {event.speakers && event.speakers.length > 0 && (
                            <div className={`mt-5 pt-5 border-t transition-colors duration-500 ${theme === 'light' ? 'border-zinc-200/30' : 'border-zinc-800/30'}`}>
                              <div className="flex flex-wrap gap-4">
                                {event.speakers.map((speaker, speakerIndex) => (
                                  <div
                                    key={speakerIndex}
                                    className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-colors duration-500 ${
                                      theme === 'light'
                                        ? 'bg-zinc-100/30 border-zinc-300/30'
                                        : 'bg-zinc-800/30 border-zinc-700/30'
                                    }`}
                                  >
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                                      theme === 'light'
                                        ? 'bg-gradient-to-br from-zinc-200 to-zinc-300'
                                        : 'bg-gradient-to-br from-zinc-700 to-zinc-800'
                                    }`}>
                                      <span className={`text-xs transition-colors duration-500 ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                        {speaker.name.substring(0, 2).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="text-sm text-foreground font-semibold transition-colors duration-500">{speaker.name}</p>
                                      <p className={`text-xs transition-colors duration-500 ${theme === 'light' ? 'text-zinc-600' : 'text-zinc-500'}`}>{speaker.title}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Cup at bottom of section */}
        <div ref={cupRef} className="hidden md:flex justify-center mt-16 relative z-30">
          <img
            src={cupImage}
            alt="Beer pong cup"
            className="w-32 h-40 object-contain drop-shadow-2xl"
          />
        </div>
      </Container>
    </section>
  );
}
