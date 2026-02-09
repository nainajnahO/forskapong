import { ArrowRight } from 'lucide-react';
import { TICKET_INFO } from '@/lib/constants';
import Container from '../common/Container';
import SectionLabel from '../common/SectionLabel';
import SectionHeader from '../common/SectionHeader';
import Card from '../common/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';

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
      <circle cx="140" cy="25" r="8" fill="currentColor" className="text-background transition-colors duration-500" />
      <circle cx="140" cy="155" r="8" fill="currentColor" className="text-background transition-colors duration-500" />

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
  const { theme } = useTheme();

  return (
    <section id={id} className="w-full py-16 md:py-24">
      <Container>
        <SectionLabel variant="gradient">{TICKET_INFO.sectionTitle}</SectionLabel>

        <SectionHeader
          title={TICKET_INFO.heading}
          titleHighlight={TICKET_INFO.headingHighlight}
          highlightClassName="font-bold text-red-600"
        />

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Ticket Illustration */}
          <div>
            <TicketIllustration />
          </div>

          {/* Right: Registration Info */}
          <div className="space-y-8">
            <Card variant="elevated" padding="lg">
              <h3 className="text-2xl font-bold text-foreground mb-4 transition-colors duration-500">Hur anmäler man sig?</h3>
              <p className={cn('mb-6 leading-relaxed transition-colors duration-500', themeText(theme, 'secondary'))}>
                {TICKET_INFO.registrationNote}
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-600 to-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-foreground font-semibold transition-colors duration-500">Lagstorlek</p>
                    <p className={cn('text-sm transition-colors duration-500', themeText(theme, 'muted'))}>2 personer per lag</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-600 to-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-foreground font-semibold transition-colors duration-500">Anmälan</p>
                    <p className={cn('text-sm transition-colors duration-500', themeText(theme, 'muted'))}>Öppnar snart</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-red-600 to-orange-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-foreground font-semibold transition-colors duration-500">Plats</p>
                    <p className={cn('text-sm transition-colors duration-500', themeText(theme, 'muted'))}>Bridgens Hus, Uppsala</p>
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
            </Card>
          </div>
        </div>
      </Container>
    </section>
  );
}
