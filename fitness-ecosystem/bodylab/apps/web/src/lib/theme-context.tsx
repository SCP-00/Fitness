/**
 * Theme Context — Dark/Light mode with system preference detection.
 *
 * Strategy: Tailwind `dark` class + CSS variables
 * Persistence: localStorage
 * Flash prevention: Inline script in index.html
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'bodylab-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  // Default to light mode — user must explicitly choose dark
  return 'light';
}

function applyTheme(theme: Theme): 'light' | 'dark' {
  const root = document.documentElement;
  const resolved = theme === 'system' ? getSystemTheme() : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  return resolved;
}

/** Read the persisted theme; falls back to `system`. Used for lazy state init. */
function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* storage may be unavailable */ }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  // Derived, not state: resolvedTheme is a pure function of the chosen theme
  // (getSystemTheme() is deterministic), so storing it would only add a
  // redundant render pass and force a setState inside an effect.
  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? getSystemTheme() : theme;

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch { /* storage may be unavailable */ }
    applyTheme(newTheme);
  };

  // Keep the <html> class in sync with the chosen theme (covers the initial
  // mount; the inline script in index.html prevents the pre-hydration flash).
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // React to OS preference changes while the user hasn't pinned a theme.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Co-located with ThemeProvider on purpose (standard context/hook pairing);
// splitting it into its own module would only churn importers.
// oxlint-disable-next-line react/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
