import { ArrowRight } from 'lucide-react';
import { TICKET_INFO } from '@/lib/constants';
import Container from '../common/Container';

interface TicketsProps {
  id?: string;
}

const TicketIllustration = () => (
  <div className="relative w-full h-96 flex items-center justify-center">
    {/* Glowing background */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-64 h-40 bg-gradient-to-r from-red-500 to-orange-600 rounded-3xl blur-3xl opacity-30 animate-pulse" />
    </div>

    {/* Ticket shape with gradient and rotation */}
    <svg
      width="280"
      height="180"
      viewBox="0 0 280 180"
      className="relative z-10 drop-shadow-2xl"
      style={{
        filter:
          'drop-shadow(0 20px 40px rgba(239, 68, 68, 0.3)) drop-shadow(0 0 20px rgba(249, 115, 22, 0.2))',
        transform: 'rotateZ(-8deg) rotateY(10deg)',
      }}
    >
      <defs>
        <linearGradient id="ticketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#EF4444', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#F97316', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Main ticket body */}
      <rect x="10" y="10" width="260" height="160" rx="20" fill="url(#ticketGradient)" />

      {/* Dashed line in middle */}
      <line
        x1="140"
        y1="30"
        x2="140"
        y2="150"
        stroke="rgba(255, 255, 255, 0.2)"
        strokeWidth="2"
        strokeDasharray="5,5"
      />

      {/* Circle cutouts on dashed line */}
      <circle cx="140" cy="25" r="8" fill="black" />
      <circle cx="140" cy="155" r="8" fill="black" />

      {/* Decorative text */}
      <text
        x="70"
        y="85"
        fontSize="20"
        fontWeight="bold"
        fill="rgba(255, 255, 255, 0.9)"
        textAnchor="middle"
      >
        FORSKÅ
      </text>
      <text
        x="70"
        y="105"
        fontSize="16"
        fill="rgba(255, 255, 255, 0.8)"
        textAnchor="middle"
      >
        PONG
      </text>
      <text
        x="210"
        y="90"
        fontSize="18"
        fontWeight="bold"
        fill="rgba(255, 255, 255, 0.7)"
        textAnchor="middle"
      >
        2026
      </text>
    </svg>
  </div>
);

export default function Tickets({ id }: TicketsProps) {
  return (
    <section id={id} className="w-full py-20">
      <Container>
        {/* Section Label */}
        <div className="flex items-center gap-4 mb-12">
          <div className="flex-1 h-px bg-gradient-to-r from-red-600 to-transparent" />
          <h2 className="text-sm font-semibold tracking-widest text-red-600 whitespace-nowrap">
            {TICKET_INFO.sectionTitle}
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-red-600 to-transparent" />
        </div>

        {/* Heading */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-display">
            {TICKET_INFO.heading} <span className="font-bold text-red-600">{TICKET_INFO.headingHighlight}</span>
          </h1>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Ticket Illustration */}
          <div>
            <TicketIllustration />
          </div>

          {/* Right: Registration Info */}
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">Hur anmäler man sig?</h3>
              <p className="text-zinc-400 mb-6 leading-relaxed">
                {TICKET_INFO.registrationNote}
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-600 to-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Lagstorlek</p>
                    <p className="text-zinc-400 text-sm">2 personer per lag</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-600 to-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Anmälan</p>
                    <p className="text-zinc-400 text-sm">Öppnar snart</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-600 to-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold">Plats</p>
                    <p className="text-zinc-400 text-sm">Bridgens Hus, Uppsala</p>
                  </div>
                </div>
              </div>

              <a
                href={TICKET_INFO.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 w-full bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all group"
              >
                Anmäl er här
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
