import { colors, radius, spacing, typeScale } from '@setu/ui-tokens';
import { useColorScheme } from 'react-native';

export type Palette = (typeof colors)['light'] | (typeof colors)['dark'];

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? colors.dark : colors.light;
}

export { radius, spacing, typeScale };

/** Headings use the platform serif to echo the website's Cormorant headings. */
export const serif = { fontFamily: 'serif' } as const;
