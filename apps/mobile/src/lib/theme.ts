import { radius, spacing, typeScale } from '@setu/ui-tokens';
import { useColorScheme } from 'react-native';

export { radius, spacing, typeScale };

/**
 * "Craft" palette for the apps: deep indigo like hand-block print, terracotta and saffron
 * like a clay diya, on warm handmade-paper backgrounds. The website keeps the shared
 * navy/orange brand tokens; only the apps use this.
 */
export const craft = {
  indigo: {
    900: '#14123A',
    800: '#1E1B4F',
    700: '#2A2668',
    600: '#3B3790',
    300: '#A7A3E8',
    100: '#E7E5FA',
  },
  terracotta: { 700: '#9E3A16', 600: '#C2491D', 500: '#D9572B', 300: '#F29B76', 100: '#FCE4D8' },
  saffron: { 600: '#D98B06', 500: '#F4A62A', 300: '#FAD07F', 100: '#FEF1D6' },
  paper: { 50: '#FFFBF4', 100: '#FBF3E6', 200: '#F3E6D1', 300: '#E8D5B8', 600: '#7A6650' },
  leaf: '#1F8A5B',
};

type SemanticKey =
  | 'primary'
  | 'primaryHover'
  | 'onPrimary'
  | 'accent'
  | 'accentHover'
  | 'onAccent'
  | 'highlight'
  | 'highlightBg'
  | 'background'
  | 'surface'
  | 'surfaceMuted'
  | 'border'
  | 'text'
  | 'textMuted'
  | 'success'
  | 'successBg'
  | 'danger'
  | 'dangerBg'
  | 'warning'
  | 'warningBg'
  | 'info'
  | 'infoBg';

const light: Record<SemanticKey, string> = {
  primary: craft.indigo[800],
  primaryHover: craft.indigo[900],
  onPrimary: '#FFFFFF',
  accent: craft.terracotta[500],
  accentHover: craft.terracotta[600],
  onAccent: '#FFFFFF',
  highlight: craft.saffron[500],
  highlightBg: craft.saffron[100],
  background: craft.paper[100],
  surface: craft.paper[50],
  surfaceMuted: craft.paper[200],
  border: craft.paper[300],
  text: craft.indigo[900],
  textMuted: craft.paper[600],
  success: craft.leaf,
  successBg: '#E3F4EA',
  danger: '#C0362C',
  dangerBg: '#FBE7E4',
  warning: craft.saffron[600],
  warningBg: craft.saffron[100],
  info: craft.indigo[600],
  infoBg: craft.indigo[100],
};

const dark: Record<SemanticKey, string> = {
  primary: craft.indigo[300],
  primaryHover: craft.indigo[100],
  onPrimary: craft.indigo[900],
  accent: '#E8693D',
  accentHover: craft.terracotta[300],
  onAccent: '#FFFFFF',
  highlight: craft.saffron[500],
  highlightBg: '#3A2A08',
  background: '#110F2E',
  surface: '#1B1842',
  surfaceMuted: '#262257',
  border: '#34306E',
  text: '#FBF3E6',
  textMuted: '#BDB6D9',
  success: '#3DBE83',
  successBg: '#0F2E21',
  danger: '#F06A5E',
  dangerBg: '#3A1714',
  warning: craft.saffron[500],
  warningBg: '#3A2A08',
  info: craft.indigo[300],
  infoBg: '#1E1B4F',
};

export type Palette = Record<SemanticKey, string>;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/**
 * Baloo 2 for headings (Indian-designed, rounded, strong in Devanagari too); Inter for
 * body text. Loaded in the root layout.
 */
export const font = {
  heading: 'Baloo2_700Bold',
  headingHeavy: 'Baloo2_800ExtraBold',
  headingSemi: 'Baloo2_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** Warm, slightly offset shadow, like paper cut-outs; elevation for Android. */
export const shadow = {
  shadowColor: '#5A3A1A',
  shadowOpacity: 0.12,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

/** A harder "stamp" shadow for hero cards and primary buttons. */
export const stamp = {
  shadowColor: craft.indigo[900],
  shadowOpacity: 0.9,
  shadowRadius: 0,
  shadowOffset: { width: 3, height: 4 },
  elevation: 5,
} as const;
