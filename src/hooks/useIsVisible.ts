import { useEffect, useState, type RefObject } from 'react';

interface UseIsVisibleOptions {
  /** Extra margin around viewport to start/stop early. Default: '200px 0px' */
  rootMargin?: string;
  /** If true, stays visible after first intersection. Default: false */
  once?: boolean;
}

export function useIsVisible(
  ref: RefObject<Element | null>,
  options: UseIsVisibleOptions = {},
): boolean {
  const { rootMargin = '200px 0px', once = false } = options;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        setIsVisible(visible);
        if (visible && once) {
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, once]);

  return isVisible;
}
