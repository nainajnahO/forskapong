import { useCallback } from 'react';

export function useScrollToSection(): (href: string) => void {
  return useCallback((href: string) => {
    const element = document.querySelector(href);
    if (!element) return;

    if (href === '#about') {
      const title = document.getElementById('about-title');
      const titleHeight = title?.offsetHeight ?? 0;
      const top = (element as HTMLElement).offsetTop - titleHeight * 2.3;
      window.scrollTo({ top, behavior: 'smooth' });
    } else {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
}
