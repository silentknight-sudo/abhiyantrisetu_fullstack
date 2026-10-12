/**
 * Abhiyantri Setu design tokens — the single source for colour, spacing, radius and type.
 * Consumed by packages/ui-web (Tailwind preset / CSS variables) and packages/ui-native.
 * Brand identity is the existing Navy #1A3A52 + Orange #FF9F43 system; do not redesign here.
 */

export const palette = {
  navy: {
    50: '#EEF3F7',
    100: '#D5E1EA',
    200: '#ABC2D4',
    300: '#7C9EB9',
    400: '#4E7898',
    500: '#2E5675',
    600: '#1A3A52', // brand
    700: '#152F43',
    800: '#102434',
    900: '#0A1823',
  },
  orange: {
    50: '#FFF5EA',
    100: '#FFE6CC',
    200: '#FFCF9E',
    300: '#FFB870',
    400: '#FF9F43', // brand
    500: '#F2861F',
    600: '#D06B0B',
    700: '#A65408',
    800: '#7C3F06',
    900: '#522A04',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F7F8FA',
    100: '#EEF0F3',
    200: '#DDE1E6',
    300: '#C1C7CF',
    400: '#9AA2AD',
    500: '#717A86',
    600: '#535B66',
    700: '#3B424C',
    800: '#252A31',
    900: '#14171B',
  },
  green: { 500: '#1F9D55', 600: '#17804A', 50: '#E9F7EF' },
  red: { 500: '#D93B3B', 600: '#B92E2E', 50: '#FDECEC' },
  amber: { 500: '#E6A100', 50: '#FFF7E0' },
  blue: { 500: '#2F6FDE', 50: '#EAF1FD' },
} as const;

/** Semantic colours. Components use these, never raw palette values. */
export const colors = {
  light: {
    primary: palette.navy[600],
    primaryHover: palette.navy[700],
    onPrimary: palette.neutral[0],
    accent: palette.orange[400],
    accentHover: palette.orange[500],
    onAccent: palette.navy[800],
    background: palette.neutral[50],
    surface: palette.neutral[0],
    surfaceMuted: palette.neutral[100],
    border: palette.neutral[200],
    text: palette.navy[800],
    textMuted: palette.neutral[500],
    success: palette.green[600],
    successBg: palette.green[50],
    danger: palette.red[600],
    dangerBg: palette.red[50],
    warning: palette.amber[500],
    warningBg: palette.amber[50],
    info: palette.blue[500],
    infoBg: palette.blue[50],
  },
  dark: {
    primary: palette.navy[300],
    primaryHover: palette.navy[200],
    onPrimary: palette.navy[900],
    accent: palette.orange[400],
    accentHover: palette.orange[300],
    onAccent: palette.navy[900],
    background: palette.navy[900],
    surface: palette.navy[800],
    surfaceMuted: palette.navy[700],
    border: palette.navy[600],
    text: palette.neutral[50],
    textMuted: palette.neutral[300],
    success: palette.green[500],
    successBg: '#0F2E1E',
    danger: palette.red[500],
    dangerBg: '#3A1515',
    warning: palette.amber[500],
    warningBg: '#3A2C05',
    info: palette.blue[500],
    infoBg: '#0E2247',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type SemanticColor = keyof (typeof colors)['light'];

/** 4-pt spacing scale, values in px (React Native uses unitless numbers). */
export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

/**
 * Type scale. Noto Sans covers Latin and Devanagari with matching metrics,
 * so Hindi and English text sit on the same baseline.
 */
export const fontFamily = {
  sans: 'Noto Sans',
  sansDevanagari: 'Noto Sans Devanagari',
  mono: 'JetBrains Mono',
} as const;

export const typeScale = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 28 },
  xl: { fontSize: 20, lineHeight: 28 },
  '2xl': { fontSize: 24, lineHeight: 32 },
  '3xl': { fontSize: 30, lineHeight: 36 },
  '4xl': { fontSize: 36, lineHeight: 44 },
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Minimum touch target for low-end Android devices (Material guidance). */
export const touchTarget = 48;

function kebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** CSS custom properties for the web surfaces, e.g. `--setu-primary`. */
export function cssVariables(scheme: ColorScheme = 'light'): string {
  const lines = Object.entries(colors[scheme]).map(([k, v]) => `  --setu-${kebab(k)}: ${v};`);
  return lines.join('\n');
}

/** Full stylesheet: light on :root, dark under prefers-color-scheme and [data-theme="dark"]. */
export function cssStylesheet(): string {
  return [
    `:root {\n${cssVariables('light')}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme='light']) {\n${cssVariables('dark').replace(/^/gm, '  ')}\n  }\n}`,
    `:root[data-theme='dark'] {\n${cssVariables('dark')}\n}`,
  ].join('\n\n');
}

/**
 * Tailwind preset (plain object, so this package has no Tailwind dependency).
 * Semantic colours resolve through CSS variables so dark mode needs no `dark:` variants.
 */
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        navy: palette.navy,
        orange: palette.orange,
        neutral: palette.neutral,
        ...Object.fromEntries(
          Object.keys(colors.light).map((k) => [kebab(k), `var(--setu-${kebab(k)})`]),
        ),
      },
      spacing: Object.fromEntries(Object.entries(spacing).map(([k, v]) => [k, `${v / 4}rem`])),
      borderRadius: Object.fromEntries(
        Object.entries(radius).map(([k, v]) => [k, v === 9999 ? '9999px' : `${v / 16}rem`]),
      ),
      fontFamily: {
        sans: [fontFamily.sans, fontFamily.sansDevanagari, 'system-ui', 'sans-serif'],
        mono: [fontFamily.mono, 'monospace'],
      },
      fontSize: Object.fromEntries(
        Object.entries(typeScale).map(([k, v]) => [
          k,
          [`${v.fontSize / 16}rem`, { lineHeight: `${v.lineHeight / 16}rem` }],
        ]),
      ),
    },
  },
} as const;
