/**
 * Greater Noida sectors served at launch. Coordinates are approximate sector centres,
 * used only to seed a requirement's location; the customer can share precise GPS.
 */
export const SECTORS = [
  { slug: 'sector-pi', name: 'Sector Pi', lat: 28.4744, lng: 77.504, pincode: '201310' },
  { slug: 'alpha-1', name: 'Alpha 1', lat: 28.4735, lng: 77.512, pincode: '201310' },
  { slug: 'alpha-2', name: 'Alpha 2', lat: 28.479, lng: 77.518, pincode: '201310' },
  { slug: 'beta-1', name: 'Beta 1', lat: 28.4705, lng: 77.5015, pincode: '201310' },
  { slug: 'beta-2', name: 'Beta 2', lat: 28.4655, lng: 77.5085, pincode: '201310' },
  { slug: 'gamma-1', name: 'Gamma 1', lat: 28.4595, lng: 77.5065, pincode: '201310' },
  { slug: 'gamma-2', name: 'Gamma 2', lat: 28.4625, lng: 77.5, pincode: '201310' },
  { slug: 'delta-1', name: 'Delta 1', lat: 28.481, lng: 77.504, pincode: '201310' },
  { slug: 'chi', name: 'Chi', lat: 28.451, lng: 77.524, pincode: '201310' },
  { slug: 'omega-1', name: 'Omega 1', lat: 28.442, lng: 77.515, pincode: '201308' },
  { slug: 'knowledge-park', name: 'Knowledge Park', lat: 28.462, lng: 77.493, pincode: '201308' },
  {
    slug: 'greater-noida-west',
    name: 'Greater Noida West',
    lat: 28.608,
    lng: 77.43,
    pincode: '201318',
  },
] as const;

export type Sector = (typeof SECTORS)[number];
