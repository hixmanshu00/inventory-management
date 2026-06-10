import { createContext, useContext } from 'react';

// Context + hook live here (no component export) so the provider file stays
// fast-refresh friendly.
export const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
