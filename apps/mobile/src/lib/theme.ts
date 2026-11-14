import { radius, spacing, typeScale } from '@setu/ui-tokens';
import { useColorScheme } from 'react-native';

export { radius, spacing, typeScale };

/**
 * Brand palette from the logo: deep navy with a bright orange, on cool light-grey screens
 * with white cards. The `craft` names are kept so imports still work: indigo = navy,
 * terracotta/saffron = orange, paper = cool greys.
 */
export const craft = {
  indigo: {
    900: '#0A1530',
    800: '#0F1E3D',
    700: '#1B2E57',
    600: '#2A4275',
    300: '#AEB9D0',
    100: '#EEF1F7',
  },
  terracotta: { 700: '#B4530A', 600: '#D9650B', 500: '#EE7A12', 300: '#F9C08A', 100: '#FDEBDA' },
  saffron: { 600: '#D9650B', 500: '#F28C28', 300: '#F9C08A', 100: '#FFF4EA' },
  paper: { 50: '#FFFFFF', 100: '#F4F6F9', 200: '#EEF1F5', 300: '#E2E6EC', 600: '#5B6475' },
  leaf: '#16A34A',
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
  surface: '#FFFFFF',
  surfaceMuted: craft.paper[200],
  border: craft.paper[300],
  text: '#111827',
  textMuted: craft.paper[600],
  success: craft.leaf,
  successBg: '#E8F7EE',
  danger: '#DC2626',
  dangerBg: '#FDECEC',
  warning: '#D97706',
  warningBg: '#FEF3E2',
  info: craft.indigo[600],
  infoBg: craft.indigo[100],
};

const dark: Record<SemanticKey, string> = {
  primary: craft.indigo[300],
  primaryHover: craft.indigo[100],
  onPrimary: craft.indigo[900],
  accent: craft.saffron[500],
  accentHover: craft.terracotta[300],
  onAccent: '#FFFFFF',
  highlight: craft.saffron[500],
  highlightBg: '#3A2A08',
  background: '#0A1530',
  surface: '#0F1E3D',
  surfaceMuted: '#1B2E57',
  border: '#2A4275',
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
 * Plus Jakarta Sans for headings; Inter for
 * body text. Loaded in the root layout.
 */
export const font = {
  heading: 'PlusJakartaSans_700Bold',
  headingHeavy: 'PlusJakartaSans_800ExtraBold',
  headingSemi: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** Warm, slightly offset shadow, like paper cut-outs; elevation for Android. */
export const shadow = {
  shadowColor: '#0F1E3D',
  shadowOpacity: 0.06,
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
