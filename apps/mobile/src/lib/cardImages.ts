import type { ImageSourcePropType } from 'react-native';

/** Photos for cards and tiles (generated with Canva). Missing keys fall back to an icon. */
const IMAGES: Record<string, ImageSourcePropType> = {
  plumber: require('../../assets/cards/plumber.png'),
  electrician: require('../../assets/cards/electrician.png'),
  'ro-and-purifier': require('../../assets/cards/ro-and-purifier.png'),
  carpenter: require('../../assets/categories/carpentry.jpg'),
  'ac-technician': require('../../assets/categories/ac-repair.jpg'),
  painter: require('../../assets/categories/painting.jpg'),
};

/** Card keys that share a photo with another key. */
const ALIAS: Record<string, string> = {
  plumbing: 'plumber',
  electrical: 'electrician',
  carpentry: 'carpenter',
  'ac-repair': 'ac-technician',
  painting: 'painter',
  'home-repaint': 'painter',
  'room-paint': 'painter',
};

/** "AC technician" → "ac-technician", the key a label's photo is saved under. */
export const imageKey = (label: string) =>
  label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function cardImage(key: string | undefined): ImageSourcePropType | undefined {
  if (!key) return undefined;
  return IMAGES[key] ?? IMAGES[ALIAS[key] ?? ''];
}
