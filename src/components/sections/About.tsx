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

  return (
    <section id={id} className="w-full pt-0 pb-16 md:pb-24">
      <Container>
        {/* Full-Width Image with Parallax */}
        <div ref={imgRef} className="w-full h-96 rounded-2xl overflow-hidden">
          <motion.img
            src="/event.webp"
            alt="TentaFestivalen Beerpong event"
            className="w-full h-[130%] object-cover"
            style={{ y: imgY }}
          />
        </div>
      </Container>
    </section>
  );
}
