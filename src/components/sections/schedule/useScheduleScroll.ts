import { useEffect, useMemo, useRef, useState } from 'react';
import { useScroll, useMotionValueEvent } from 'motion/react';
import {
  EVENTS,
  PHASES,
  BOTTOM_PADDING,
  progressToMinute,
  formatMinutesToClock,
} from './schedule-data';

export function useScheduleScroll(
  sectionRef: React.RefObject<HTMLDivElement | null>,
  headerRef: React.RefObject<HTMLDivElement | null>,
) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [availableHeight, setAvailableHeight] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const [currentMinute, setCurrentMinute] = useState(() => progressToMinute(scrollYProgress.get()));
  const currentMinuteRef = useRef(currentMinute);

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const next = progressToMinute(latest);
    if (next !== currentMinuteRef.current) {
      currentMinuteRef.current = next;
      setCurrentMinute(next);
    }
  });

  // Measure available height for content translation
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function measure() {
      const headerH = headerRef.current?.offsetHeight ?? 0;
      setAvailableHeight(window.innerHeight - headerH - BOTTOM_PADDING);
    }
    function debouncedMeasure() {
      clearTimeout(timer);
      timer = setTimeout(measure, 150);
    }
    measure();
    window.addEventListener('resize', debouncedMeasure);
    return () => {
      window.removeEventListener('resize', debouncedMeasure);
      clearTimeout(timer);
    };
  }, [headerRef]);

  // Track content height via ResizeObserver
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setContentHeight(el.scrollHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const translateY = contentHeight > availableHeight ? -(contentHeight - availableHeight) : 0;

  const visibleEvents = useMemo(
    () => EVENTS.filter((ev) => currentMinute >= ev.startMinute),
    [currentMinute],
  );

  const clockText = formatMinutesToClock(Math.max(0, currentMinute));

  const currentPhase = useMemo(
    () => [...PHASES].reverse().find((p) => currentMinute >= p.startMinute)?.name ?? PHASES[0].name,
    [currentMinute],
  );

  return {
    contentRef,
    translateY,
    visibleEvents,
    clockText,
    currentPhase,
  };
}
