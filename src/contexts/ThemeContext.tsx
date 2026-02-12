import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext, type BackgroundVariant } from './ThemeContextDef';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [backgroundVariant, setBackgroundVariant] = useState<BackgroundVariant>(() => {
    // Migration logic: check for old 'theme' localStorage first
    const oldTheme = localStorage.getItem('theme');
    if (oldTheme === 'light' || oldTheme === 'dark') {
      const migratedVariant: BackgroundVariant = oldTheme === 'light' ? 'framer' : 'fluid';
      localStorage.removeItem('theme');
      localStorage.setItem('backgroundVariant', migratedVariant);
      return migratedVariant;
    }

    // Check for new backgroundVariant localStorage
    const stored = localStorage.getItem('backgroundVariant');
    return stored === 'fluid' || stored === 'framer' ? stored : 'framer';
  });

  useEffect(() => {
    localStorage.setItem('backgroundVariant', backgroundVariant);
    document.documentElement.classList.toggle('framer', backgroundVariant === 'framer');
  }, [backgroundVariant]);

  const toggleBackground = useCallback(() => {
    setBackgroundVariant((prev) => (prev === 'fluid' ? 'framer' : 'fluid'));
  }, []);

  const value = useMemo(
    () => ({
      theme: 'dark' as const,
      backgroundVariant,
      toggleBackground,
    }),
    [backgroundVariant, toggleBackground],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
