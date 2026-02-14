import { useRef, useEffect, useCallback } from 'react';
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

/** Pixels per millisecond — ~60 px/s */
const SPEED = 0.06;

export default function Sponsors() {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const posRef = useRef(0);
  const lastRef = useRef(0);

  const tick = useCallback((ts: number) => {
    const track = trackRef.current;
    if (!track) return;

    const delta = lastRef.current ? ts - lastRef.current : 0;
    lastRef.current = ts;

    // Cap delta at 100ms to prevent jumps after tab switch / background
    posRef.current -= Math.min(delta, 100) * SPEED;

    // Reset when we've scrolled one full set (first half)
    const halfWidth = track.scrollWidth / 2;
    if (halfWidth > 0 && Math.abs(posRef.current) >= halfWidth) {
      posRef.current += halfWidth;
    }

    track.style.transform = `translate3d(${posRef.current}px,0,0)`;
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // 4 copies per half → enough to fill ultra-wide screens
  const half = Array.from({ length: 4 }, (_, i) =>
    SPONSORS.map((s) => <SponsorItem key={`${s.name}-${i}`} sponsor={s} />),
  );

  return (
    <section className="py-6 md:py-8">
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex w-max items-center will-change-transform"
        >
          {half}
          {half}
        </div>
      </div>
    </section>
  );
}
