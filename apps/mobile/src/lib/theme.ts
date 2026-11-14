import { radius, spacing, typeScale } from '@setu/ui-tokens';
import { useColorScheme } from 'react-native';

export { radius, spacing, typeScale };

/**
 * Brand palette from the logo: navy #1A3A52 and orange #FF9F43, on warm sand surfaces
 * (the shared @setu/ui-tokens system). The `craft` names are kept so imports still work:
 * indigo = navy, terracotta = orange, saffron = light orange, paper = sand.
 */
export const craft = {
  indigo: {
    900: '#0A1823',
    800: '#1A3A52',
    700: '#2E5675',
    600: '#4E7898',
    300: '#ABC2D4',
    100: '#EEF3F7',
  },
  terracotta: { 700: '#A65408', 600: '#D06B0B', 500: '#F2861F', 300: '#FFCF9E', 100: '#FFE6CC' },
  saffron: { 600: '#D06B0B', 500: '#FF9F43', 300: '#FFCF9E', 100: '#FFF5EA' },
  paper: { 50: '#FBF7F0', 100: '#F6EFE3', 200: '#EFE4D2', 300: '#E4D4BB', 600: '#7A6E62' },
  leaf: '#17804A',
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
  accent: craft.saffron[500],
  accentHover: craft.terracotta[500],
  onAccent: craft.indigo[800],
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
  accent: craft.saffron[500],
  accentHover: '#FFB870',
  onAccent: craft.indigo[900],
  highlight: craft.saffron[500],
  highlightBg: '#3A2A08',
  background: '#0A1823',
  surface: '#102434',
  surfaceMuted: '#152F43',
  border: '#1A3A52',
  text: '#F7F8FA',
  textMuted: '#C1C7CF',
  success: '#1F9D55',
  successBg: '#0F2E1E',
  danger: '#D93B3B',
  dangerBg: '#3A1515',
  warning: '#E6A100',
  warningBg: '#3A2C05',
  info: '#2F6FDE',
  infoBg: '#0E2247',
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
  shadowColor: '#1A3A52',
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
