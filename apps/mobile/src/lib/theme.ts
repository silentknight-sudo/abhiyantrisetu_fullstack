import { radius, spacing, typeScale } from '@setu/ui-tokens';
import { useColorScheme } from 'react-native';

export { radius, spacing, typeScale };

/**
 * Premium palette for the apps: ink black and clean white like a luxury brand, with a
 * champagne-gold accent used sparingly for highlights. Calls to action are solid black.
 * (The `craft` name is kept so existing imports keep working.)
 */
export const craft = {
  indigo: {
    900: '#0B0B0D',
    800: '#141416',
    700: '#1F1F23',
    600: '#2E2E34',
    300: '#B9B9C3',
    100: '#EDEDF1',
  },
  terracotta: { 700: '#8A6A22', 600: '#A07C2C', 500: '#B8913A', 300: '#DCC48E', 100: '#F6EEDC' },
  saffron: { 600: '#A07C2C', 500: '#C9A24B', 300: '#E3CF9E', 100: '#F8F2E3' },
  paper: { 50: '#FFFFFF', 100: '#F6F6F7', 200: '#EFEFF2', 300: '#E3E3E8', 600: '#6B6B76' },
  leaf: '#0F8A5F',
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
  primary: '#111113',
  primaryHover: '#000000',
  onPrimary: '#FFFFFF',
  // Main buttons are black like premium brands; gold marks highlights and selections.
  accent: '#111113',
  accentHover: '#000000',
  onAccent: '#FFFFFF',
  highlight: craft.saffron[500],
  highlightBg: craft.saffron[100],
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: craft.paper[100],
  border: craft.paper[300],
  text: '#111113',
  textMuted: craft.paper[600],
  success: craft.leaf,
  successBg: '#E6F5EF',
  danger: '#D1343A',
  dangerBg: '#FCEBEC',
  warning: '#B7791F',
  warningBg: '#FDF4E3',
  info: '#2F5BEA',
  infoBg: '#EAF0FE',
};

const dark: Record<SemanticKey, string> = {
  primary: '#FFFFFF',
  primaryHover: '#F2F2F2',
  onPrimary: '#0B0B0D',
  accent: '#FFFFFF',
  accentHover: '#F2F2F2',
  onAccent: '#0B0B0D',
  highlight: craft.saffron[500],
  highlightBg: '#2A2414',
  background: '#0B0B0D',
  surface: '#151518',
  surfaceMuted: '#1E1E22',
  border: '#2A2A30',
  text: '#F5F5F7',
  textMuted: '#A0A0AB',
  success: '#34C38F',
  successBg: '#0F2A20',
  danger: '#F2555B',
  dangerBg: '#3A1517',
  warning: '#E0A23B',
  warningBg: '#33260D',
  info: '#6F8FF5',
  infoBg: '#152045',
};

export type Palette = Record<SemanticKey, string>;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Plus Jakarta Sans for headings, Inter for body text. Loaded in the root layout. */
export const font = {
  heading: 'PlusJakartaSans_700Bold',
  headingHeavy: 'PlusJakartaSans_800ExtraBold',
  headingSemi: 'PlusJakartaSans_600SemiBold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** Soft, neutral shadow; elevation for Android. */
export const shadow = {
  shadowColor: '#000000',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

/** A slightly deeper shadow for hero cards and primary buttons. */
export const stamp = {
  shadowColor: '#000000',
  shadowOpacity: 0.14,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 5,
} as const;
