/**
 * Design tokens + light/dark themes.
 *
 * Two-level token model (architecture.md §6):
 *   primitive ramps (palette, scales)  →  semantic theme (surface, text, primary…)
 *
 * Components consume ONLY semantic tokens via `useTheme()`. Dark mode is a second
 * mapping of the same semantic keys, so no component knows which theme is active.
 *
 * Color choices target WCAG AA: body text ≥ 4.5:1, large text/UI ≥ 3:1 against the
 * surface it sits on. `textMuted` and `onPrimary` pairings are chosen to clear 4.5:1.
 * Aesthetic reference: Linear / Stripe Dashboard / Notion — restrained neutrals, a
 * single confident brand accent, soft elevation.
 */
import { Platform } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

// ===========================================================================
// PRIMITIVES — raw scales. Never referenced directly by components.
// ===========================================================================
const palette = {
  // Neutral (slate) ramp
  gray: {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    150: '#eaeff5',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    850: '#172033',
    900: '#0f172a',
    950: '#0a0f1c',
    975: '#070b14',
    1000: '#000000',
  },
  // Brand (indigo) ramp
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  green: { 100: '#dcfce7', 300: '#86efac', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
  red: { 100: '#fee2e2', 300: '#fca5a5', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
  amber: { 100: '#fef3c7', 300: '#fcd34d', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
  blue: { 100: '#dbeafe', 300: '#93c5fd', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  // Alpha overlays (theme-agnostic)
  blackA: { 40: 'rgba(2,6,23,0.40)', 60: 'rgba(2,6,23,0.60)' },
} as const;

// ---------------------------------------------------------------------------
// Spacing — 4px base grid. spacing(n) = n * 4.
// ---------------------------------------------------------------------------
const SPACE_UNIT = 4;
export const spacing = (n: number): number => n * SPACE_UNIT;

/** Named steps for ergonomic, on-grid usage. */
export const space = {
  none: 0,
  xs: spacing(1), // 4
  sm: spacing(2), // 8
  md: spacing(3), // 12
  lg: spacing(4), // 16
  xl: spacing(6), // 24
  '2xl': spacing(8), // 32
  '3xl': spacing(12), // 48
  '4xl': spacing(16), // 64
} as const;

// ---------------------------------------------------------------------------
// Radii
// ---------------------------------------------------------------------------
export const radii = {
  none: 0,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  pill: 9999,
} as const;

// ---------------------------------------------------------------------------
// Typography — system fonts (native feel, zero load cost), one mono fallback.
// ---------------------------------------------------------------------------
const fontFamily = {
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  }) as string,
};

const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 38,
} as const;

/** Ready-to-spread text style variants. Components reference these by name. */
const textVariants = {
  display: { fontSize: fontSize['4xl'], lineHeight: 44, fontWeight: fontWeight.bold, letterSpacing: -0.5 },
  h1: { fontSize: fontSize['3xl'], lineHeight: 38, fontWeight: fontWeight.bold, letterSpacing: -0.4 },
  h2: { fontSize: fontSize['2xl'], lineHeight: 32, fontWeight: fontWeight.semibold, letterSpacing: -0.3 },
  h3: { fontSize: fontSize.xl, lineHeight: 28, fontWeight: fontWeight.semibold, letterSpacing: -0.2 },
  title: { fontSize: fontSize.lg, lineHeight: 24, fontWeight: fontWeight.semibold, letterSpacing: -0.1 },
  body: { fontSize: fontSize.md, lineHeight: 22, fontWeight: fontWeight.regular, letterSpacing: 0 },
  bodyStrong: { fontSize: fontSize.md, lineHeight: 22, fontWeight: fontWeight.semibold, letterSpacing: 0 },
  label: { fontSize: fontSize.sm, lineHeight: 18, fontWeight: fontWeight.medium, letterSpacing: 0 },
  caption: { fontSize: fontSize.xs, lineHeight: 16, fontWeight: fontWeight.medium, letterSpacing: 0.2 },
  mono: { fontSize: fontSize.sm, lineHeight: 20, fontWeight: fontWeight.regular, fontFamily: fontFamily.mono },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;

export const typography = {
  fontFamily,
  fontWeight,
  fontSize,
  variants: textVariants,
} as const;

// ---------------------------------------------------------------------------
// Elevation / shadows — platform-aware (native shadow props vs web boxShadow).
// ---------------------------------------------------------------------------
type ShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
> & { boxShadow?: string };

const makeShadow = (
  y: number,
  blur: number,
  opacity: number,
  elevation: number,
): ShadowStyle =>
  Platform.select<ShadowStyle>({
    web: { boxShadow: `0px ${y}px ${blur}px rgba(2,6,23,${opacity})` },
    default: {
      shadowColor: palette.gray[950],
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation,
    },
  }) as ShadowStyle;

export const shadows = {
  none: {} as ShadowStyle,
  sm: makeShadow(1, 3, 0.08, 1),
  md: makeShadow(4, 12, 0.1, 4),
  lg: makeShadow(12, 28, 0.16, 12),
} as const;

// ===========================================================================
// SEMANTIC THEME
// ===========================================================================
export interface ThemeColors {
  /** App canvas. */
  background: string;
  /** Cards, sheets, inputs — sits on background. */
  surface: string;
  /** Hover/elevated surface. */
  surfaceHover: string;
  /** Pressed/active surface. */
  surfaceActive: string;
  /** Subtle filled chips, table header. */
  surfaceMuted: string;

  border: string;
  borderStrong: string;

  text: string;
  textMuted: string;
  textSubtle: string;
  /** Text on a dark/inverse fill. */
  textInverse: string;

  primary: string;
  primaryHover: string;
  primaryActive: string;
  /** Tinted primary background for soft buttons/badges. */
  primaryMuted: string;
  onPrimary: string;

  danger: string;
  dangerMuted: string;
  onDanger: string;

  success: string;
  successMuted: string;

  warning: string;
  warningMuted: string;

  info: string;
  infoMuted: string;

  focusRing: string;
  overlay: string;
  skeleton: string;
}

export interface Theme {
  readonly name: 'light' | 'dark';
  readonly colors: ThemeColors;
  readonly spacing: typeof spacing;
  readonly space: typeof space;
  readonly radii: typeof radii;
  readonly typography: typeof typography;
  readonly shadows: typeof shadows;
}

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: palette.gray[50],
    surface: palette.gray[0],
    surfaceHover: palette.gray[50],
    surfaceActive: palette.gray[100],
    surfaceMuted: palette.gray[100],

    border: palette.gray[200],
    borderStrong: palette.gray[300],

    text: palette.gray[900], // ~16:1 on surface
    textMuted: palette.gray[500], // ~4.8:1 on surface — AA body
    textSubtle: palette.gray[400], // large/UI text only
    textInverse: palette.gray[0],

    primary: palette.brand[600],
    primaryHover: palette.brand[700],
    primaryActive: palette.brand[800],
    primaryMuted: palette.brand[50],
    onPrimary: palette.gray[0], // white on brand600 ≈ 6.5:1

    danger: palette.red[600],
    dangerMuted: palette.red[100],
    onDanger: palette.gray[0],

    success: palette.green[600],
    successMuted: palette.green[100],

    warning: palette.amber[600],
    warningMuted: palette.amber[100],

    info: palette.blue[600],
    infoMuted: palette.blue[100],

    focusRing: palette.brand[500],
    overlay: palette.blackA[40],
    skeleton: palette.gray[150],
  },
  spacing,
  space,
  radii,
  typography,
  shadows,
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: palette.gray[975],
    surface: palette.gray[900],
    surfaceHover: palette.gray[850],
    surfaceActive: palette.gray[800],
    surfaceMuted: palette.gray[850],

    border: palette.gray[800],
    borderStrong: palette.gray[700],

    text: palette.gray[50], // ~15:1 on surface
    textMuted: palette.gray[400], // ~6:1 on surface — AA body
    textSubtle: palette.gray[500],
    textInverse: palette.gray[900],

    primary: palette.brand[500],
    primaryHover: palette.brand[400],
    primaryActive: palette.brand[300],
    primaryMuted: 'rgba(99,102,241,0.16)',
    onPrimary: palette.gray[0],

    danger: palette.red[500],
    dangerMuted: 'rgba(239,68,68,0.16)',
    onDanger: palette.gray[0],

    success: palette.green[500],
    successMuted: 'rgba(34,197,94,0.16)',

    warning: palette.amber[500],
    warningMuted: 'rgba(245,158,11,0.16)',

    info: palette.blue[500],
    infoMuted: 'rgba(59,130,246,0.16)',

    focusRing: palette.brand[400],
    overlay: palette.blackA[60],
    skeleton: palette.gray[850],
  },
  spacing,
  space,
  radii,
  typography,
  shadows,
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
export type ThemeName = keyof typeof themes;
