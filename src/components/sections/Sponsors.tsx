import type { ComponentType } from 'react';
import Container from '../common/Container';

// SVG Logo Placeholder Components
const LogoCircles = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" className="mx-auto">
    <circle cx="30" cy="30" r="20" fill="#4A6CF7" opacity="0.8" />
    <circle cx="50" cy="40" r="20" fill="#4A6CF7" opacity="0.9" />
    <circle cx="70" cy="30" r="20" fill="#4A6CF7" opacity="0.8" />
  </svg>
);

const LogoBoldText = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" className="mx-auto">
    <rect x="15" y="35" width="15" height="30" fill="#4A6CF7" rx="2" />
    <rect x="38" y="35" width="15" height="30" fill="#4A6CF7" rx="2" />
    <rect x="61" y="35" width="15" height="30" fill="#4A6CF7" rx="2" />
    <rect x="84" y="35" width="10" height="30" fill="#4A6CF7" rx="2" />
  </svg>
);

const LogoConnected = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" className="mx-auto">
    <g fill="none" stroke="#4A6CF7" strokeWidth="4" strokeLinecap="round">
      <path d="M 20 50 Q 30 30, 45 40" />
      <path d="M 45 40 Q 60 35, 75 50" />
      <path d="M 75 50 Q 70 65, 55 60" />
      <path d="M 55 60 Q 40 65, 25 50" />
    </g>
  </svg>
);

const LogoStylized = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" className="mx-auto">
    <text x="50" y="60" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#4A6CF7">
      LOGO
    </text>
    <text x="50" y="80" textAnchor="middle" fontSize="10" fill="#4A6CF7" opacity="0.7">
      IPSUM
    </text>
  </svg>
);

const SponsorCard = ({
  logoComponent: LogoComponent,
}: {
  logoComponent: ComponentType;
}) => (
  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-center h-32 hover:border-zinc-700 transition-colors">
    <LogoComponent />
  </div>
);

interface SponsorsProps {
  id?: string;
}

export default function Sponsors({ id }: SponsorsProps) {
  const sponsors = [
    { logoComponent: LogoCircles },
    { logoComponent: LogoBoldText },
    { logoComponent: LogoConnected },
    { logoComponent: LogoStylized },
  ];

  return (
    <section id={id} className="w-full py-20">
      <Container>
        {/* Section Label */}
        <div className="flex items-center gap-4 mb-12">
          <div className="flex-1 h-px bg-gradient-to-r from-red-600 to-transparent" />
          <h2 className="text-sm font-semibold tracking-widest text-red-600 whitespace-nowrap">
            SPONSORER
          </h2>
          <div className="flex-1 h-px bg-gradient-to-l from-red-600 to-transparent" />
        </div>

        {/* Heading */}
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-display">
            Möt våra <span className="italic text-zinc-400">sponsorer</span>
          </h1>
        </div>

        {/* Sponsor Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {sponsors.map((sponsor, index) => (
            <SponsorCard key={index} logoComponent={sponsor.logoComponent} />
          ))}
        </div>
      </Container>
    </section>
  );
}
