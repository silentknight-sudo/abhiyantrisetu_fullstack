import type { MessageKey } from '@/lib/i18n';

/**
 * Renovation services with a details page (design S1) and an option sheet (S2).
 * Rates are indicative labour rates shown before the free measurement visit; the
 * professional's written quote after the visit is what the customer pays.
 */
export type ServiceOption = {
  name: MessageKey;
  note: MessageKey;
  /** Indicative rate in rupees per `unit`; null = priced after the visit. */
  rate: number | null;
};
export type RenovationService = {
  slug: string;
  title: MessageKey;
  group: MessageKey;
  category?: string;
  unit: 'sqft' | 'job';
  days: string;
  scope: string[];
  included: MessageKey[];
  excluded: MessageKey[];
  options: ServiceOption[];
  /** What the customer may already have, e.g. tiles or paint. */
  material?: string;
};

const TILES_IN: MessageKey[] = [
  'Site measurement and level check',
  'Cement-sand bed or tile adhesive laying',
  'Tile fixing with spacers and grouting',
  'Skirting up to 4 inches',
  'Debris collection after work',
];
const TILES_OUT: MessageKey[] = [
  'Tiles and adhesive (unless you choose Setu supply)',
  'Old tile breaking (book removal & relay)',
  'Plumbing or electrical changes',
];

export const SERVICES: Record<string, RenovationService> = {
  'floor-tiles': {
    slug: 'floor-tiles',
    title: 'Floor tile fitting',
    group: 'Flooring & Tiling',
    unit: 'sqft',
    days: '3–5',
    scope: ['Flooring'],
    included: TILES_IN,
    excluded: TILES_OUT,
    material: 'tiles',
    options: [
      { name: 'Vitrified 2×2 ft', note: 'Most homes', rate: 35 },
      { name: 'Large format 2×4 ft', note: 'Needs leveller', rate: null },
      { name: 'Ceramic 1×1 ft', note: 'Bathrooms, balconies', rate: null },
    ],
  },
  'tile-relay': {
    slug: 'tile-relay',
    title: 'Old tile removal & relay',
    group: 'Flooring & Tiling',
    unit: 'sqft',
    days: '4–6',
    scope: ['Flooring'],
    included: ['Breaking and removing old tiles', ...TILES_IN],
    excluded: [
      'Tiles and adhesive (unless you choose Setu supply)',
      'Plumbing or electrical changes',
    ],
    material: 'tiles',
    options: [
      { name: 'Break, level and relay', note: 'Most homes', rate: 55 },
      { name: 'Relay over old tiles', note: 'When the floor is sound', rate: null },
    ],
  },
  'wall-tiles': {
    slug: 'wall-tiles',
    title: 'Wall tile fitting',
    group: 'Flooring & Tiling',
    unit: 'sqft',
    days: '2–4',
    scope: ['Bathroom', 'Kitchen'],
    included: [
      'Site measurement and level check',
      'Tile fixing with spacers and grouting',
      'Debris collection after work',
    ],
    excluded: TILES_OUT,
    material: 'tiles',
    options: [
      { name: 'Bathroom walls', note: 'Up to ceiling', rate: 40 },
      { name: 'Kitchen dado', note: 'Above the counter', rate: null },
      { name: 'Elevation cladding', note: 'Outside walls', rate: null },
    ],
  },
  'marble-laying': {
    slug: 'marble-laying',
    title: 'Marble / granite laying',
    group: 'Flooring & Tiling',
    unit: 'sqft',
    days: '5–8',
    scope: ['Flooring'],
    included: [
      'Site measurement and level check',
      'Laying on cement bed',
      'Joint filling',
      'Debris collection after work',
    ],
    excluded: ['Marble or granite stone', 'Polishing (book separately)'],
    material: 'stone',
    options: [
      { name: 'Floors', note: 'Living and bedrooms', rate: 75 },
      { name: 'Stairs', note: 'Treads and risers', rate: null },
      { name: 'Kitchen platform', note: 'Granite top', rate: null },
    ],
  },
  'marble-polish': {
    slug: 'marble-polish',
    title: 'Marble polishing',
    group: 'Flooring & Tiling',
    unit: 'sqft',
    days: '2–3',
    scope: ['Flooring'],
    included: ['Grinding and diamond polish', 'Joint filling', 'Cleaning after work'],
    excluded: ['Stone repair or replacement'],
    options: [
      { name: 'Diamond polish', note: 'Most floors', rate: 28 },
      { name: 'Crystallisation', note: 'Extra shine', rate: null },
    ],
  },
  'wood-flooring': {
    slug: 'wood-flooring',
    title: 'Laminate / engineered wood',
    group: 'Flooring & Tiling',
    unit: 'sqft',
    days: '2–3',
    scope: ['Flooring'],
    included: ['Underlay foam', 'Click-lock laying', 'Skirting and end profiles'],
    excluded: ['Flooring planks (unless you choose Setu supply)', 'Levelling a very uneven floor'],
    material: 'planks',
    options: [
      { name: 'Laminate 8 mm', note: 'Bedrooms, living room', rate: 95 },
      { name: 'Engineered wood', note: 'Real wood top layer', rate: null },
    ],
  },
  'bathroom-renovation': {
    slug: 'bathroom-renovation',
    title: 'Full bathroom renovation',
    group: 'Renovation',
    unit: 'job',
    days: '10–15',
    scope: ['Bathroom', 'Plumbing', 'Waterproofing'],
    included: [
      'Breaking old tiles and fittings',
      'Waterproofing the floor',
      'New wall and floor tiles',
      'New plumbing lines and fittings fixing',
      'Debris removal',
    ],
    excluded: [
      'Tiles, sanitaryware and fittings (unless you choose Setu supply)',
      'Electrical changes',
    ],
    material: 'tiles and fittings',
    options: [
      { name: 'Standard bathroom', note: 'Up to 40 sq ft', rate: 89000 },
      { name: 'Large bathroom', note: 'Above 40 sq ft', rate: null },
    ],
  },
  'bathroom-retiling': {
    slug: 'bathroom-retiling',
    title: 'Bathroom retiling',
    group: 'Renovation',
    unit: 'job',
    days: '4–6',
    scope: ['Bathroom'],
    included: ['Breaking old tiles', 'New wall and floor tiles', 'Grouting', 'Debris removal'],
    excluded: ['Tiles (unless you choose Setu supply)', 'Plumbing changes'],
    material: 'tiles',
    options: [{ name: 'Standard bathroom', note: 'Up to 40 sq ft', rate: 28000 }],
  },
  'home-repaint': {
    slug: 'home-repaint',
    title: 'Full home repaint',
    group: 'Painting',
    category: 'painting',
    unit: 'sqft',
    days: '4–7',
    scope: ['Painting'],
    included: [
      'Furniture covering',
      'Putty touch-up and sanding',
      'Primer and two coats',
      'Cleaning after work',
    ],
    excluded: ['Paint (unless you choose Setu supply)', 'Wall repairs beyond minor cracks'],
    material: 'paint',
    options: [
      { name: 'Repaint (same colour family)', note: 'Most homes', rate: 14 },
      { name: 'Fresh painting with putty', note: 'New or damaged walls', rate: null },
    ],
  },
  'room-paint': {
    slug: 'room-paint',
    title: 'Single room / wall',
    group: 'Painting',
    category: 'painting',
    unit: 'job',
    days: '1–2',
    scope: ['Painting'],
    included: ['Furniture covering', 'Primer and two coats', 'Cleaning after work'],
    excluded: ['Paint (unless you choose Setu supply)'],
    material: 'paint',
    options: [{ name: 'One room', note: 'Walls and ceiling', rate: 4500 }],
  },
  'exterior-paint': {
    slug: 'exterior-paint',
    title: 'Exterior building',
    group: 'Painting',
    category: 'painting',
    unit: 'sqft',
    days: '7–12',
    scope: ['Painting'],
    included: [
      'Scaffolding or rope access',
      'Crack filling',
      'Primer and two coats of exterior emulsion',
    ],
    excluded: ['Paint (unless you choose Setu supply)'],
    material: 'paint',
    options: [{ name: 'Exterior emulsion', note: 'Weather-proof', rate: 22 }],
  },
  'terrace-waterproofing': {
    slug: 'terrace-waterproofing',
    title: 'Terrace waterproofing',
    group: 'Waterproofing',
    category: 'waterproofing',
    unit: 'sqft',
    days: '3–5',
    scope: ['Waterproofing'],
    included: [
      'Surface cleaning and crack filling',
      'Two-coat waterproof membrane',
      'Water ponding test',
    ],
    excluded: ['Re-tiling the terrace (book tile + waterproofing)'],
    options: [
      { name: 'Membrane coating', note: 'Most terraces', rate: 45 },
      { name: 'Membrane + new tiles', note: 'Full redo', rate: 110 },
    ],
  },
  'bathroom-waterproofing': {
    slug: 'bathroom-waterproofing',
    title: 'Bathroom waterproofing',
    group: 'Waterproofing',
    category: 'waterproofing',
    unit: 'job',
    days: '3–5',
    scope: ['Bathroom', 'Waterproofing'],
    included: [
      'Removing floor tiles',
      'Waterproof coating with corner treatment',
      'Ponding test',
      'Relaying floor tiles',
    ],
    excluded: ['New tiles (unless you choose Setu supply)'],
    options: [{ name: 'Standard bathroom', note: 'Up to 40 sq ft', rate: null }],
  },
  'house-construction': {
    slug: 'house-construction',
    title: 'House construction',
    group: 'Construction',
    category: 'house-construction',
    unit: 'sqft',
    days: '180–300',
    scope: ['Full home'],
    included: [
      'Structure as per approved drawings',
      'Brickwork, plaster and flooring',
      'Plumbing and electrical',
      'Stage-wise inspections and photos',
    ],
    excluded: ['Architect and approval fees', 'Interiors and furniture'],
    options: [
      { name: 'Full construction', note: 'Ready to move in', rate: 1750 },
      { name: 'Grey structure only', note: 'Frame, walls and roof', rate: 1150 },
    ],
  },
  'modular-kitchen': {
    slug: 'modular-kitchen',
    title: 'Modular kitchen',
    group: 'Carpentry & Interiors',
    category: 'modular-kitchen',
    unit: 'job',
    days: '20–30',
    scope: ['Kitchen'],
    included: ['Measurement and 3D design', 'Base and wall cabinets', 'Hardware and fitting'],
    excluded: ['Appliances, sink and granite top (unless added)'],
    options: [
      { name: 'L-shaped kitchen', note: 'Most flats', rate: 120000 },
      { name: 'U-shaped or parallel', note: 'Larger kitchens', rate: null },
    ],
  },
  wardrobe: {
    slug: 'wardrobe',
    title: 'Modular wardrobe',
    group: 'Carpentry & Interiors',
    unit: 'sqft',
    days: '15–20',
    scope: ['Carpentry'],
    included: ['Measurement and design', 'Carcass, shutters and hardware', 'Fitting at site'],
    excluded: ['Lofts (book separately)'],
    options: [
      { name: 'Hinged doors', note: 'Most rooms', rate: 1600 },
      { name: 'Sliding doors', note: 'Saves space', rate: null },
    ],
  },
};
