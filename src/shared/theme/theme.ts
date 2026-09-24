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
 * surface it sits on. Ratios in the comments below were measured, not estimated.
 * Aesthetic reference: a well-kept tutor's notebook — warm paper neutrals, ink text,
 * hairline rules instead of shadows, a serif reserved for titles and hero numbers,
 * and one restrained indigo accent used only for actions and selection.
 */
import { Platform } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

// ===========================================================================
// PRIMITIVES — raw scales. Never referenced directly by components.
// ===========================================================================
const palette = {
  // Warm neutral ("paper → ink") ramp
  paper: {
    0: '#ffffff',
    25: '#fdfcf9',
    50: '#f6f4ef',
    75: '#f3f1eb',
    100: '#f0ede6',
    200: '#e6e1d7',
    300: '#d4cdbf',
    400: '#9a9387',
    500: '#6a645a',
    // dark-side steps
    600: '#a6a095',
    650: '#7a756b',
    700: '#3d3a34',
    750: '#2f2d28',
    800: '#23221e',
    825: '#201f1b',
    850: '#1b1a17',
    900: '#141311',
    ink: '#1c1a17',
    inkLight: '#eeebe4',
  },
  // Brand (deep indigo) ramp
  indigo: {
    50: '#f1f1fa',
    100: '#e2e1f4',
    200: '#c6c4ea',
    300: '#a09ddb',
    400: '#7a76c9',
    450: '#6e6ac6',
    500: '#5b56b5',
    600: '#46419c',
    700: '#37337f',
    800: '#2a2763',
    900: '#1e1c47',
  },
  // Desaturated status hues: [light-mode ink, light tint, dark-mode ink]
  moss: { ink: '#3a7047', tint: '#e5efe6', light: '#7db88a' },
  ochre: { ink: '#8c5810', tint: '#f6ebd7', light: '#d9a24a' },
  brick: { ink: '#b0392c', tint: '#f7e3df', light: '#e07a6c', hover: '#962f24', lightHover: '#e8958a' },
  slate: { ink: '#3b6690', tint: '#e2eaf3', light: '#7fa7cf' },
  // Alpha overlays (theme-agnostic)
  blackA: { 40: 'rgba(20,19,17,0.40)', 60: 'rgba(0,0,0,0.60)' },
} as const;

/** 16% wash of a hex color — dark-mode tints for pills and soft fills. */
const wash = (hex: string, alpha = 0.16): string => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

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
  sm: 4,
  md: 6,
  lg: 10,
  xl: 14,
  '2xl': 20,
  pill: 9999,
} as const;

// ---------------------------------------------------------------------------
// Typography — Plus Jakarta Sans for UI/body, Newsreader (serif) for display titles only.
//
// Custom fonts are registered one family per weight (FontGate), so weight is chosen
// by FAMILY, not `fontWeight`: Android ignores fontWeight on custom faces, and web
// would faux-bold a face that is already bold. `fontFor()` does the mapping; variants
// therefore carry `fontFamily` and no `fontWeight`. If the fonts fail to load, the
// unknown family names fall back to the platform font.
// ---------------------------------------------------------------------------
const fontFamily = {
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemibold: 'PlusJakartaSans_600SemiBold',
  serif: 'Newsreader_500Medium',
  serifSemibold: 'Newsreader_600SemiBold',
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

export type FontFace = 'sans' | 'serif';

/** Resolve a weight to the loaded family for that face (400 / 500 / 600+). */
export const fontFor = (weight: TextStyle['fontWeight'], face: FontFace = 'sans'): string => {
  const w = weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight);
  if (face === 'serif') return w >= 600 ? fontFamily.serifSemibold : fontFamily.serif;
  if (w >= 600) return fontFamily.sansSemibold;
  if (w >= 500) return fontFamily.sansMedium;
  return fontFamily.sans;
};

const fontSize = {
  '2xs': 11,
  xs: 12,
  sm: 13,
  md: 15,
  lg: 16,
  xl: 18,
  '2xl': 22,
  '3xl': 28,
  '4xl': 36,
} as const;

/** Ready-to-spread text style variants. Components reference these by name. */
const textVariants = {
  display: { fontSize: fontSize['4xl'], lineHeight: 42, fontFamily: fontFamily.serif, letterSpacing: -0.6 },
  h1: { fontSize: fontSize['3xl'], lineHeight: 34, fontFamily: fontFamily.serif, letterSpacing: -0.4 },
  h2: { fontSize: fontSize['2xl'], lineHeight: 28, fontFamily: fontFamily.serif, letterSpacing: -0.2 },
  h3: { fontSize: fontSize.xl, lineHeight: 24, fontFamily: fontFamily.sansSemibold, letterSpacing: -0.2 },
  title: { fontSize: fontSize.lg, lineHeight: 22, fontFamily: fontFamily.sansSemibold, letterSpacing: -0.1 },
  body: { fontSize: fontSize.md, lineHeight: 22, fontFamily: fontFamily.sans, letterSpacing: 0 },
  bodyStrong: { fontSize: fontSize.md, lineHeight: 22, fontFamily: fontFamily.sansSemibold, letterSpacing: 0 },
  label: { fontSize: fontSize.sm, lineHeight: 18, fontFamily: fontFamily.sansMedium, letterSpacing: 0 },
  caption: { fontSize: fontSize.xs, lineHeight: 16, fontFamily: fontFamily.sans, letterSpacing: 0.1 },
  /** Section labels: small caps-style uppercase. */
  eyebrow: {
    fontSize: fontSize['2xs'],
    lineHeight: 14,
    fontFamily: fontFamily.sansSemibold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  mono: { fontSize: fontSize.sm, lineHeight: 20, fontFamily: fontFamily.mono },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;

/** Which face a variant is set in — lets a weight override stay in the same face. */
export const variantFace = (v: TextVariant): FontFace =>
  v === 'display' || v === 'h1' || v === 'h2' ? 'serif' : 'sans';

export const typography = {
  fontFamily,
  fontWeight,
  fontSize,
  variants: textVariants,
} as const;

// ---------------------------------------------------------------------------
// Icons — one stroke width, three sizes (lucide).
// ---------------------------------------------------------------------------
export const iconSize = { sm: 16, md: 20, lg: 24 } as const;
export const iconStroke = 1.75;

// ---------------------------------------------------------------------------
// Layout — one page container everywhere (see shared/ui Page).
// ---------------------------------------------------------------------------
export const layout = {
  pageMaxWidth: 1120,
  gutter: { compact: 16, medium: 24, expanded: 32 },
  sidebarWidth: 232,
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
    web: { boxShadow: `0px ${y}px ${blur}px rgba(28,26,23,${opacity})` },
    default: {
      shadowColor: palette.paper.ink,
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
      elevation,
    },
  }) as ShadowStyle;

export const shadows = {
  none: {} as ShadowStyle,
  /** Hairline lift — pairs with a border; the editorial default is no shadow at all. */
  sm: makeShadow(1, 2, 0.05, 1),
  /** Popovers, drag lift. */
  md: makeShadow(6, 16, 0.08, 4),
  /** Modals and sheets only. */
  lg: makeShadow(16, 40, 0.14, 12),
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
  /** Primary as TEXT (links, ghost buttons, selected labels) — AA on surface. */
  primaryText: string;
  onPrimary: string;

  danger: string;
  dangerHover: string;
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
  readonly iconSize: typeof iconSize;
  readonly layout: typeof layout;
}

export const lightTheme: Theme = {
  name: 'light',
  colors: {
    background: palette.paper[50],
    surface: palette.paper[0],
    surfaceHover: palette.paper[75],
    surfaceActive: palette.paper[100],
    surfaceMuted: palette.paper[100],

    border: palette.paper[200],
    borderStrong: palette.paper[300],

    text: palette.paper.ink, // 17.4:1 on surface
    textMuted: palette.paper[500], // 5.9:1 surface, 5.0:1 surfaceMuted — AA body
    textSubtle: palette.paper[400], // 3.0:1 — large/UI text only
    textInverse: palette.paper[0],

    primary: palette.indigo[600],
    primaryHover: palette.indigo[700],
    primaryActive: palette.indigo[800],
    primaryMuted: palette.indigo[50],
    primaryText: palette.indigo[600], // 8.4:1 on surface
    onPrimary: palette.paper[0], // white on indigo600 8.4:1

    danger: palette.brick.ink, // 6.1:1 surface, 4.9:1 on its tint
    dangerHover: palette.brick.hover,
    dangerMuted: palette.brick.tint,
    onDanger: palette.paper[0],

    success: palette.moss.ink, // 5.9:1 surface, 5.0:1 on its tint
    successMuted: palette.moss.tint,

    warning: palette.ochre.ink, // 6.0:1 surface, 5.1:1 on its tint
    warningMuted: palette.ochre.tint,

    info: palette.slate.ink, // 6.0:1 surface, 5.0:1 on its tint
    infoMuted: palette.slate.tint,

    focusRing: palette.indigo[500],
    overlay: palette.blackA[40],
    skeleton: palette.paper[100],
  },
  spacing,
  space,
  radii,
  typography,
  shadows,
  iconSize,
  layout,
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: palette.paper[900],
    surface: palette.paper[850],
    surfaceHover: palette.paper[825],
    surfaceActive: palette.paper[800],
    surfaceMuted: palette.paper[800],

    border: palette.paper[750],
    borderStrong: palette.paper[700],

    text: palette.paper.inkLight, // 14.6:1 on surface
    textMuted: palette.paper[600], // 6.7:1 on surface — AA body
    textSubtle: palette.paper[650], // 3.8:1 — large/UI text only
    textInverse: palette.paper.ink,

    primary: palette.indigo[450], // fill: white on it 4.6:1
    primaryHover: palette.indigo[400],
    primaryActive: palette.indigo[500],
    primaryMuted: wash(palette.indigo[400]),
    primaryText: palette.indigo[300], // 6.9:1 on surface
    onPrimary: palette.paper[0],

    danger: palette.brick.light, // 5.9:1 surface
    dangerHover: palette.brick.lightHover,
    dangerMuted: wash(palette.brick.light),
    onDanger: palette.paper.ink,

    success: palette.moss.light, // 7.5:1 surface
    successMuted: wash(palette.moss.light),

    warning: palette.ochre.light, // 7.6:1 surface
    warningMuted: wash(palette.ochre.light),

    info: palette.slate.light, // 6.9:1 surface
    infoMuted: wash(palette.slate.light),

    focusRing: palette.indigo[300],
    overlay: palette.blackA[60],
    skeleton: palette.paper[800],
  },
  spacing,
  space,
  radii,
  typography,
  // Shadows read as mud on dark surfaces — elevation there is border + surface step.
  shadows: { none: shadows.none, sm: shadows.none, md: shadows.none, lg: shadows.none },
  iconSize,
  layout,
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
export type ThemeName = keyof typeof themes;
