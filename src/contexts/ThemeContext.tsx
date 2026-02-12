import { createContext, useContext, useEffect, useState } from 'react';

type BackgroundVariant = 'fluid' | 'framer';
type Theme = 'light' | 'dark';

// Light theme is intentionally disabled — always returns 'dark'
interface ThemeContextType {
  theme: Theme;
  backgroundVariant: BackgroundVariant;
  toggleBackground: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

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
    return (stored === 'fluid' || stored === 'framer') ? stored : 'framer';
  });

  useEffect(() => {
    localStorage.setItem('backgroundVariant', backgroundVariant);
    document.documentElement.classList.toggle('framer', backgroundVariant === 'framer');
  }, [backgroundVariant]);

  const toggleBackground = () => {
    setBackgroundVariant(prev => prev === 'fluid' ? 'framer' : 'fluid');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: 'dark',
        backgroundVariant,
        toggleBackground,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
