import { useRef } from 'react';
import { useScroll, useTransform, motion } from 'motion/react';
import { ABOUT_CONTENT } from '@/lib/constants';
import Container from '../common/Container';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { themeText } from '@/lib/theme-utils';

interface AboutProps {
  id?: string;
}

export default function About({ id }: AboutProps) {
  const { theme } = useTheme();
  const imgRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: imgRef,
    offset: ['start end', 'end start'],
  });
  const imgY = useTransform(scrollYProgress, (v) => (v - 0.5) * -160);

  return (
    <section id={id} className="w-full pt-0 pb-16 md:pb-24">
      <Container>
        {/* Description Text */}
        <div className="space-y-4 mb-16 max-w-3xl">
          <p className={cn('font-sans leading-relaxed text-base transition-colors duration-500', themeText(theme, 'secondary'))}>
            {ABOUT_CONTENT.description1}
          </p>
          <p className={cn('font-sans leading-relaxed text-base transition-colors duration-500', themeText(theme, 'secondary'))}>
            {ABOUT_CONTENT.description2}
          </p>
        </div>

        {/* Full-Width Image with Parallax */}
        <div ref={imgRef} className="w-full h-96 rounded-2xl overflow-hidden">
          <motion.img
            src="/event-photo.webp"
            alt="Forskåpong event"
            className="w-full h-[130%] object-cover"
            style={{ y: imgY }}
          />
        </div>
      </Container>
    </section>
  );
}
