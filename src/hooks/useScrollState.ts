import { useState, useEffect, useRef } from 'react';

export function useScrollState(threshold: number = 50): boolean {
  const [isScrolled, setIsScrolled] = useState(false);
  const lastValue = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > threshold;
      if (scrolled !== lastValue.current) {
        lastValue.current = scrolled;
        setIsScrolled(scrolled);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return isScrolled;
}
