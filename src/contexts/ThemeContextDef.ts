import { createContext } from 'react';

type BackgroundVariant = 'fluid' | 'framer';
type Theme = 'light' | 'dark';

// Light theme is intentionally disabled — always returns 'dark'
export interface ThemeContextType {
  theme: Theme;
  backgroundVariant: BackgroundVariant;
  toggleBackground: () => void;
}

export type { BackgroundVariant };

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
