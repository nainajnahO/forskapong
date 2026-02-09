import type { ComponentType } from 'react';
import Container from '../common/Container';
import SectionLabel from '../common/SectionLabel';
import SectionHeader from '../common/SectionHeader';
import Card from '../common/Card';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';

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
  <Card variant="bordered" className="flex items-center justify-center h-32">
    <LogoComponent />
  </Card>
);

interface SponsorsProps {
  id?: string;
}

export default function Sponsors({ id }: SponsorsProps) {
  const { theme } = useTheme();
  const sponsors = [
    { logoComponent: LogoCircles },
    { logoComponent: LogoBoldText },
    { logoComponent: LogoConnected },
    { logoComponent: LogoStylized },
  ];

  return (
    <section id={id} className="w-full py-16 md:py-24">
      <Container>
        <SectionLabel variant="gradient">SPONSORER</SectionLabel>

        <SectionHeader
          title="Möt våra"
          titleHighlight="sponsorer"
          highlightClassName={cn('italic transition-colors duration-500', themeText(theme, 'secondary'))}
        />

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
