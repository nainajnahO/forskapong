import { SCHEDULE_PHASES } from '@/lib/constants';
import Container from '../common/Container';
import type { ScheduleEvent } from '@/types';

interface ScheduleProps {
  id?: string;
}

export default function Schedule({ id }: ScheduleProps) {
  return (
    <section id={id} className="w-full py-16 md:py-24">
      <Container>
        {/* Section label */}
        <div className="flex items-center gap-4 mb-12">
          <div className="h-px w-10 bg-white"></div>
          <h2 className="text-sm md:text-base font-semibold tracking-wider text-white uppercase">
            Körschema
          </h2>
        </div>

        {/* Main heading */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-white font-display">
            Vad <span className="italic text-gray-400">Händish?</span>
          </h1>
        </div>

        {/* Timeline */}
        <div className="space-y-12">
          {SCHEDULE_PHASES.map((phase, phaseIndex) => (
            <div key={phaseIndex}>
              {/* Phase marker */}
              <div className="flex items-center gap-4 mb-8">
                <div className="flex-shrink-0">
                  <div className="bg-red-600 rounded-lg px-6 py-3 w-fit">
                    <p className="text-white font-bold text-lg">{phase.name}</p>
                  </div>
                </div>
                <div className="flex-grow h-px bg-zinc-700"></div>
                <p className="text-zinc-400 text-2xl font-bold flex-shrink-0">{phase.startTime}</p>
              </div>

              {/* Events */}
              <div className="space-y-8 ml-4 md:ml-8">
                {phase.events.map((event: ScheduleEvent, eventIndex) => (
                  <div key={eventIndex} className="flex gap-6">
                    {/* Time label */}
                    <div className="flex-shrink-0 w-24 md:w-32 text-right">
                      <p className="text-zinc-500 text-sm md:text-base">{event.time}</p>
                    </div>

                    {/* Event card */}
                    <div className="flex-grow">
                      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                        {/* Event title */}
                        <h3
                          className={`text-xl md:text-2xl mb-2 ${
                            event.bold ? 'font-bold' : 'font-semibold'
                          } ${event.italic ? 'italic' : ''} text-white font-display`}
                        >
                          {event.title}
                        </h3>

                        {/* Description */}
                        <p className="text-zinc-400 text-sm md:text-base mb-4 whitespace-pre-wrap">
                          {event.description}
                        </p>

                        {/* Speakers */}
                        {event.speakers && event.speakers.length > 0 && (
                          <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-zinc-800">
                            {event.speakers.map((speaker, speakerIndex) => (
                              <div key={speakerIndex} className="flex items-center gap-3">
                                {/* Avatar placeholder */}
                                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                                  <span className="text-zinc-500 text-xs text-center px-1">
                                    {speaker.name.substring(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                {/* Speaker info */}
                                <div>
                                  <p className="text-white font-semibold text-sm">{speaker.name}</p>
                                  <p className="text-zinc-500 text-xs">{speaker.title}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
