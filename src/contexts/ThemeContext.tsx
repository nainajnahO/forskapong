import { createContext, useContext, useEffect, useState } from 'react';

type BackgroundVariant = 'fluid' | 'framer';
type Theme = 'light' | 'dark'; // Type preserved for backward compatibility, but always 'dark' in practice

interface ThemeContextType {
  theme: Theme; // Always returns 'dark' but type preserved for backward compatibility
  backgroundVariant: BackgroundVariant;
  toggleBackground: () => void;
  toggleTheme: () => void; // Kept for backward compatibility
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
    return (stored === 'fluid' || stored === 'framer') ? stored : 'fluid';
  });

  useEffect(() => {
    localStorage.setItem('backgroundVariant', backgroundVariant);
    // Remove the light class toggle - we're always in dark mode now
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
        toggleTheme: toggleBackground // Alias for backward compatibility
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
