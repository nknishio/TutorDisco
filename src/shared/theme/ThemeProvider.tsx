/**
 * Theme context + provider + hooks.
 *
 * `ThemeProvider` resolves the active theme from an explicit preference
 * ('light' | 'dark' | 'system') against the OS color scheme, and exposes it via
 * context. Components read it with `useTheme()`; styled components use `makeStyles`
 * so per-theme StyleSheets are created once and memoized.
 */
import React, {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import type { ThemePreference } from '../../domain/types/settings';
import { darkTheme, lightTheme, type Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  /** The resolved concrete scheme actually rendered. */
  scheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  /** User preference. Defaults to following the OS. */
  preference?: ThemePreference;
}

export const ThemeProvider = ({
  preference = 'system',
  children,
}: PropsWithChildren<ThemeProviderProps>) => {
  const os = useColorScheme();
  const scheme: 'light' | 'dark' =
    preference === 'system' ? (os === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: scheme === 'dark' ? darkTheme : lightTheme, scheme }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/** Access the active theme. Throws if used outside a ThemeProvider. */
export const useTheme = (): Theme => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx.theme;
};

export const useThemeScheme = (): 'light' | 'dark' => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeScheme must be used within a ThemeProvider');
  return ctx.scheme;
};

/**
 * Build a theme-aware StyleSheet factory.
 *
 *   const useStyles = makeStyles((t) => ({ box: { backgroundColor: t.colors.surface } }));
 *   const styles = useStyles();
 *
 * The StyleSheet is recreated only when the theme identity changes (light↔dark).
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): () => T {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
