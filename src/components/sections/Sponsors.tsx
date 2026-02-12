import { SPONSORS } from '@/lib/constants';

function SponsorItem({ sponsor }: { sponsor: (typeof SPONSORS)[number] }) {
  const content = sponsor.logo ? (
    <img
      src={sponsor.logo}
      alt={sponsor.name}
      className="h-14 max-w-[140px] shrink-0 object-contain opacity-50 grayscale transition-opacity hover:opacity-80 md:h-20 md:max-w-[180px]"
    />
  ) : (
    <span className="shrink-0 text-5xl opacity-50 md:text-6xl">
      {sponsor.text}
    </span>
  );

  if (sponsor.href) {
    return (
      <a
        href={sponsor.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-8 shrink-0 md:mx-12"
      >
        {content}
      </a>
    );
  }

  return <span className="mx-8 shrink-0 md:mx-12">{content}</span>;
}

export default function Sponsors() {
  const logoSet = Array.from({ length: 6 }, (_, i) =>
    SPONSORS.map((sponsor) => (
      <SponsorItem key={`${sponsor.name}-${i}`} sponsor={sponsor} />
    )),
  );

  return (
    <section className="py-6 md:py-8">
      <div className="overflow-hidden">
        <div className="flex w-max items-center animate-marquee">
          {logoSet}
          {logoSet}
        </div>
      </div>
    </section>
  );
}
