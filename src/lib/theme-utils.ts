type Theme = 'light' | 'dark';

export function themeBorder(theme: Theme): string {
  return theme === 'light' ? 'border-zinc-200' : 'border-zinc-800';
}

export function themeText(
  theme: Theme,
  variant: 'primary' | 'secondary' | 'muted' = 'primary',
): string {
  const map = {
    primary: theme === 'light' ? 'text-zinc-900' : 'text-white',
    secondary: theme === 'light' ? 'text-zinc-700' : 'text-zinc-400',
    muted: theme === 'light' ? 'text-zinc-600' : 'text-zinc-500',
  };
  return map[variant];
}

export function themeBg(theme: Theme, variant: 'card' | 'section' | 'subtle' = 'card'): string {
  const map = {
    card:
      theme === 'light' ? 'bg-white border border-zinc-200' : 'bg-zinc-900 border border-zinc-800',
    section: theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900',
    subtle:
      theme === 'light' ? 'bg-zinc-100/30 border-zinc-300/30' : 'bg-zinc-800/30 border-zinc-700/30',
  };
  return map[variant];
}

export function themeLine(theme: Theme): string {
  return theme === 'light' ? 'bg-zinc-900' : 'bg-white';
}

export function themeGradientLine(theme: Theme): string {
  return theme === 'light'
    ? 'bg-gradient-to-r from-transparent via-zinc-300 to-transparent'
    : 'bg-gradient-to-r from-transparent via-zinc-700 to-transparent';
}
