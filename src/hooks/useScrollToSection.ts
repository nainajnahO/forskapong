import { useCallback } from 'react';

export function useScrollToSection(): (href: string) => void {
  return useCallback((href: string) => {
    const element = document.querySelector(href);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth' });
  }, []);
}
