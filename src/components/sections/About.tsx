import { useRef } from 'react';
import { useScroll, useTransform, motion } from 'motion/react';
import Container from '../common/Container';

interface AboutProps {
  id?: string;
}

export default function About({ id }: AboutProps) {
  const imgRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: imgRef,
    offset: ['start end', 'end start'],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '-30%']);
  const titleOpacity = useTransform(scrollYProgress, [0.15, 0.4], [0, 1]);
  const titleY = useTransform(scrollYProgress, [0.15, 0.4], [20, 0]);

  return (
    <section id={id} className="w-full pt-0 pb-16 md:pb-24">
      <Container>
        {/* Full-Width Image with Parallax + overlaid title */}
        <div ref={imgRef} className="relative w-full h-96 rounded-2xl overflow-hidden">
          <motion.img
            src="/event.webp"
            alt="TentaFestivalen Beerpong event"
            className="w-full h-[130%] object-cover"
            style={{ y: imgY }}
          />
          {/* Scrim: darker at top/bottom edges, lighter in the middle so the photo
              stays visible while the centered title keeps enough contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/60" />
          {/* Centered title overlay */}
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center px-4 pointer-events-none"
            style={{ opacity: titleOpacity, y: titleY }}
          >
            <h1
              id="about-title"
              className="text-center text-4xl md:text-6xl font-display text-white hdr-white-fill"
            >
              Terminens sista
              <br />
              <span className="italic text-brand-500 hdr-text-fill pr-[0.15em]">Beerpong</span>
            </h1>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
