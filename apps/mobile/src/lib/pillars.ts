import type { IconName } from '@/components/ui';
import type { MessageKey } from '@/lib/i18n';

type Type = 'service' | 'renovation' | 'consult' | 'material_rfq' | 'equipment';

/** Where a tile or card leads: the fixed-price menu, the quote form, or a screen. */
export type Go =
  | { book: string }
  | { req: Type; category?: string; title?: MessageKey }
  | { href: '/professionals' | '/calculator' | '/assistant' };

export type PillarItem = { label: MessageKey; icon: IconName; go: Go };
export type PillarCard = { label: MessageKey; meta?: MessageKey; icon: IconName; go: Go };
export type PillarSection = { title: MessageKey; sub?: MessageKey; cards: PillarCard[]; go: Go };
export type Pillar = {
  key: PillarKey;
  title: MessageKey;
  sub: MessageKey;
  icon: IconName;
  search: MessageKey;
  grid: PillarItem[];
  sections: PillarSection[];
  banner: { eyebrow: MessageKey; title: MessageKey; body: MessageKey; go: Go; after: number };
  cta: { label: MessageKey; go: Go };
};
export type PillarKey = 'build' | 'home' | 'materials' | 'equipment' | 'professionals';

const reno = (title: MessageKey, category?: string): Go => ({
  req: 'renovation',
  title,
  ...(category ? { category } : {}),
});
const svc = (title: MessageKey, category?: string): Go => ({
  req: 'service',
  title,
  ...(category ? { category } : {}),
});
const mat = (title: MessageKey): Go => ({ req: 'material_rfq', title });
const eqp = (title: MessageKey): Go => ({ req: 'equipment', title });
const pro = (title: MessageKey): Go => ({ req: 'consult', title });

export const PILLARS: Record<PillarKey, Pillar> = {
  build: {
    key: 'build',
    title: 'Build & Renovate',
    sub: 'Verified contractors · compare quotes',
    icon: 'business',
    search: 'Search renovation, flooring, painting…',
    grid: [
      { label: 'Renovation', icon: 'home', go: reno('Renovation') },
      {
        label: 'Construction',
        icon: 'business',
        go: reno('House construction', 'house-construction'),
      },
      { label: 'Painting', icon: 'color-palette', go: reno('Painting', 'painting') },
      { label: 'Waterproofing', icon: 'umbrella', go: reno('Waterproofing', 'waterproofing') },
      { label: 'Flooring & Tiling', icon: 'grid', go: reno('Flooring & Tiling') },
      { label: 'Carpentry & Interiors', icon: 'hammer', go: reno('Carpentry & Interiors') },
      {
        label: 'Plumbing & Electrical works',
        icon: 'flash',
        go: reno('Plumbing & Electrical works'),
      },
      { label: 'Masonry & Civil', icon: 'construct', go: reno('Masonry & Civil') },
      { label: 'Fabrication', icon: 'build', go: reno('Fabrication') },
    ],
    sections: [
      {
        title: 'Renovation',
        sub: 'Itemised quotes in 24 hours',
        go: reno('Renovation'),
        cards: [
          {
            label: 'Full bathroom renovation',
            meta: 'Package',
            icon: 'water',
            go: reno('Full bathroom renovation'),
          },
          { label: 'Bathroom retiling', icon: 'grid', go: reno('Bathroom retiling') },
          {
            label: 'Sanitary & fittings upgrade',
            icon: 'water-outline',
            go: reno('Sanitary & fittings upgrade'),
          },
        ],
      },
      {
        title: 'Construction',
        sub: 'Pay stage by stage',
        go: reno('House construction', 'house-construction'),
        cards: [
          {
            label: 'House construction',
            meta: '5 milestones',
            icon: 'business',
            go: reno('House construction', 'house-construction'),
          },
          {
            label: 'Grey structure only',
            icon: 'cube',
            go: reno('Grey structure only', 'house-construction'),
          },
          { label: 'Extra floor', icon: 'layers', go: reno('Extra floor', 'house-construction') },
        ],
      },
      {
        title: 'Painting',
        go: reno('Painting', 'painting'),
        cards: [
          {
            label: 'Full home repaint',
            meta: 'Package',
            icon: 'color-palette',
            go: reno('Full home repaint', 'painting'),
          },
          {
            label: 'Single room / wall',
            icon: 'brush',
            go: reno('Single room / wall', 'painting'),
          },
          {
            label: 'Exterior building',
            icon: 'business',
            go: reno('Exterior building', 'painting'),
          },
        ],
      },
      {
        title: 'Waterproofing',
        go: reno('Waterproofing', 'waterproofing'),
        cards: [
          {
            label: 'Terrace waterproofing',
            icon: 'umbrella',
            go: reno('Terrace waterproofing', 'waterproofing'),
          },
          {
            label: 'Terrace tile + waterproofing',
            icon: 'grid',
            go: reno('Terrace tile + waterproofing', 'waterproofing'),
          },
          {
            label: 'Bathroom waterproofing',
            icon: 'water',
            go: reno('Bathroom waterproofing', 'waterproofing'),
          },
        ],
      },
      {
        title: 'Flooring & Tiling',
        go: reno('Flooring & Tiling'),
        cards: [
          {
            label: 'Floor tile fitting',
            meta: 'Free measurement',
            icon: 'grid',
            go: reno('Floor tile fitting'),
          },
          {
            label: 'Old tile removal & relay',
            icon: 'refresh',
            go: reno('Old tile removal & relay'),
          },
          { label: 'Wall tile fitting', icon: 'apps', go: reno('Wall tile fitting') },
        ],
      },
      {
        title: 'Carpentry & Interiors',
        go: reno('Carpentry & Interiors'),
        cards: [
          {
            label: 'Modular kitchen',
            icon: 'restaurant',
            go: reno('Modular kitchen', 'modular-kitchen'),
          },
          { label: 'Modular wardrobe', icon: 'file-tray-stacked', go: reno('Modular wardrobe') },
          { label: 'Loft & storage', icon: 'albums', go: reno('Loft & storage') },
        ],
      },
    ],
    banner: {
      eyebrow: 'Building a house?',
      title: 'Stage payments with photo proof',
      body: 'See the cost first, then hire and pay by milestone.',
      go: { href: '/calculator' },
      after: 1,
    },
    cta: { label: 'Post a requirement', go: { req: 'renovation' } },
  },
  home: {
    key: 'home',
    title: 'Home Services',
    sub: 'Fixed prices · choose your pro',
    icon: 'construct',
    search: 'Search plumber, fan repair, AC service…',
    grid: [
      { label: 'Plumber', icon: 'water', go: { book: 'plumbing' } },
      { label: 'Electrician', icon: 'flash', go: { book: 'electrical' } },
      { label: 'Carpenter', icon: 'hammer', go: { book: 'carpentry' } },
      { label: 'AC technician', icon: 'snow', go: { book: 'ac-repair' } },
      { label: 'Painter', icon: 'color-palette', go: svc('Painter', 'painting') },
      { label: 'RO & purifier', icon: 'beaker', go: svc('RO & purifier') },
      { label: 'Appliance repair', icon: 'tv', go: svc('Appliance repair') },
      { label: 'Cleaning', icon: 'sparkles', go: svc('Cleaning') },
      { label: 'Pest control', icon: 'bug', go: svc('Pest control') },
    ],
    sections: [
      {
        title: 'Plumbing',
        sub: 'Fixed prices',
        go: { book: 'plumbing' },
        cards: [
          { label: 'Tap / mixer repair', icon: 'water', go: { book: 'plumbing' } },
          { label: 'Blockage removal', icon: 'funnel', go: { book: 'plumbing' } },
          { label: 'Water tank cleaning', icon: 'cube', go: { book: 'plumbing' } },
        ],
      },
      {
        title: 'Electrical',
        sub: 'Fixed prices',
        go: { book: 'electrical' },
        cards: [
          { label: 'Fan installation', icon: 'sync', go: { book: 'electrical' } },
          { label: 'Switchboard repair', icon: 'flash', go: { book: 'electrical' } },
          { label: 'Inverter setup', icon: 'battery-charging', go: { book: 'electrical' } },
        ],
      },
      {
        title: 'Carpentry',
        sub: 'Fixed prices',
        go: { book: 'carpentry' },
        cards: [
          { label: 'Door lock / hinge fix', icon: 'lock-closed', go: { book: 'carpentry' } },
          { label: 'Furniture assembly', icon: 'bed', go: { book: 'carpentry' } },
          { label: 'Curtain rod fitting', icon: 'reorder-four', go: { book: 'carpentry' } },
        ],
      },
      {
        title: 'AC & appliances',
        go: { book: 'ac-repair' },
        cards: [
          { label: 'Split AC service', icon: 'snow', go: { book: 'ac-repair' } },
          { label: 'AC gas refill', icon: 'thermometer', go: { book: 'ac-repair' } },
          {
            label: 'Washing machine repair',
            icon: 'refresh-circle',
            go: svc('Washing machine repair'),
          },
        ],
      },
    ],
    banner: {
      eyebrow: 'New on Setu',
      title: 'Choose your own professional',
      body: 'See verified profiles before you book a home service.',
      go: { book: 'plumbing' },
      after: 1,
    },
    cta: { label: 'Book a service', go: { book: 'plumbing' } },
  },
  materials: {
    key: 'materials',
    title: 'Buy Materials',
    sub: 'Compare supplier rates · delivered to site',
    icon: 'cube',
    search: 'Search cement, TMT, sand, tiles…',
    grid: [
      { label: 'Cement', icon: 'cube', go: mat('Cement') },
      { label: 'Steel / TMT', icon: 'barbell', go: mat('Steel / TMT') },
      { label: 'Sand & aggregate', icon: 'ellipse', go: mat('Sand & aggregate') },
      { label: 'Bricks & blocks', icon: 'apps', go: mat('Bricks & blocks') },
      { label: 'Tiles', icon: 'grid', go: mat('Tiles') },
      { label: 'Paint', icon: 'color-fill', go: mat('Paint') },
      { label: 'Plumbing pipes', icon: 'git-branch', go: mat('Plumbing pipes') },
      { label: 'Electricals', icon: 'flash', go: mat('Electricals') },
      { label: 'Hardware', icon: 'build', go: mat('Hardware') },
    ],
    sections: [
      {
        title: 'Cement',
        go: mat('Cement'),
        cards: [
          { label: 'OPC 53 grade', icon: 'cube', go: mat('OPC 53 grade') },
          { label: 'PPC cement', icon: 'cube-outline', go: mat('PPC cement') },
          { label: 'White cement', icon: 'square-outline', go: mat('White cement') },
        ],
      },
      {
        title: 'Steel / TMT',
        sub: 'Ask for the weighbridge slip',
        go: mat('Steel / TMT'),
        cards: [
          { label: 'TMT Fe 500D', icon: 'barbell', go: mat('TMT Fe 500D') },
          { label: 'TMT Fe 550D', icon: 'barbell', go: mat('TMT Fe 550D') },
          { label: 'Binding wire', icon: 'infinite', go: mat('Binding wire') },
        ],
      },
      {
        title: 'Sand & aggregate',
        go: mat('Sand & aggregate'),
        cards: [
          { label: 'Yamuna sand', icon: 'ellipse', go: mat('Yamuna sand') },
          { label: 'M-sand', icon: 'ellipse-outline', go: mat('M-sand') },
          { label: 'Aggregate 20 mm', icon: 'shapes', go: mat('Aggregate 20 mm') },
        ],
      },
      {
        title: 'Bricks & blocks',
        go: mat('Bricks & blocks'),
        cards: [
          { label: 'Red clay bricks', icon: 'apps', go: mat('Red clay bricks') },
          { label: 'AAC blocks', icon: 'tablet-landscape', go: mat('AAC blocks') },
          { label: 'Fly ash bricks', icon: 'apps-outline', go: mat('Fly ash bricks') },
        ],
      },
    ],
    banner: {
      eyebrow: 'Big order?',
      title: 'One list, rates from every supplier',
      body: 'Post your full list and compare verified suppliers.',
      go: { req: 'material_rfq' },
      after: 1,
    },
    cta: { label: 'Request bulk quote', go: { req: 'material_rfq' } },
  },
  equipment: {
    key: 'equipment',
    title: 'Rent Equipment',
    sub: 'With or without operator',
    icon: 'car',
    search: 'Search JCB, mixer, crane…',
    grid: [
      { label: 'Earthmoving', icon: 'car', go: eqp('Earthmoving') },
      { label: 'Concrete', icon: 'sync-circle', go: eqp('Concrete') },
      { label: 'Lifting', icon: 'arrow-up-circle', go: eqp('Lifting') },
      { label: 'Scaffolding', icon: 'grid-outline', go: eqp('Scaffolding') },
      { label: 'Compaction', icon: 'contract', go: eqp('Compaction') },
      { label: 'Drilling & breaking', icon: 'hammer', go: eqp('Drilling & breaking') },
      { label: 'Generators', icon: 'battery-charging', go: eqp('Generators') },
      { label: 'Water tankers', icon: 'water', go: eqp('Water tankers') },
      { label: 'Transport', icon: 'bus', go: eqp('Transport') },
    ],
    sections: [
      {
        title: 'Earthmoving',
        go: eqp('Earthmoving'),
        cards: [
          { label: 'JCB backhoe', icon: 'car', go: eqp('JCB backhoe') },
          { label: 'Excavator (Poclain)', icon: 'car-sport', go: eqp('Excavator (Poclain)') },
          { label: 'Tractor trolley', icon: 'bus', go: eqp('Tractor trolley') },
        ],
      },
      {
        title: 'Concrete',
        go: eqp('Concrete'),
        cards: [
          { label: 'Concrete mixer', icon: 'sync-circle', go: eqp('Concrete mixer') },
          { label: 'Needle vibrator', icon: 'pulse', go: eqp('Needle vibrator') },
          { label: 'Transit mixer', icon: 'bus', go: eqp('Transit mixer') },
        ],
      },
      {
        title: 'Lifting',
        go: eqp('Lifting'),
        cards: [
          { label: 'Hydra crane', icon: 'arrow-up-circle', go: eqp('Hydra crane') },
          { label: 'Material hoist', icon: 'arrow-up', go: eqp('Material hoist') },
          { label: 'Mobile crane', icon: 'car', go: eqp('Mobile crane') },
        ],
      },
      {
        title: 'Scaffolding',
        go: eqp('Scaffolding'),
        cards: [
          { label: 'Cup-lock scaffolding', icon: 'grid-outline', go: eqp('Cup-lock scaffolding') },
          { label: 'Steel props', icon: 'reorder-four', go: eqp('Steel props') },
          { label: 'Shuttering plates', icon: 'square', go: eqp('Shuttering plates') },
        ],
      },
    ],
    banner: {
      eyebrow: 'Planning a slab?',
      title: 'Mixer + vibrator + labour, one request',
      body: 'Bundle the equipment for your casting day.',
      go: eqp('Concrete'),
      after: 1,
    },
    cta: { label: 'Check availability', go: { req: 'equipment' } },
  },
  professionals: {
    key: 'professionals',
    title: 'Find a Professional',
    sub: 'Architects, engineers & more',
    icon: 'compass',
    search: 'Search architect, vastu, structural…',
    grid: [
      { label: 'Architect', icon: 'compass', go: { href: '/professionals' } },
      { label: 'Interior designer', icon: 'color-palette', go: { href: '/professionals' } },
      { label: 'Civil engineer', icon: 'construct', go: { href: '/professionals' } },
      { label: 'Structural engineer', icon: 'git-network', go: { href: '/professionals' } },
      { label: 'Vastu consultant', icon: 'navigate', go: { href: '/professionals' } },
      { label: 'Land surveyor', icon: 'map', go: pro('Land surveyor') },
      { label: 'Landscape designer', icon: 'leaf', go: pro('Landscape designer') },
      { label: 'MEP consultant', icon: 'flash', go: pro('MEP consultant') },
      { label: 'Property valuer', icon: 'cash', go: pro('Property valuer') },
    ],
    sections: [
      {
        title: 'Architect',
        go: { href: '/professionals' },
        cards: [
          { label: 'House plan & layout', icon: 'compass', go: pro('House plan & layout') },
          { label: '3D elevation', icon: 'cube', go: pro('3D elevation') },
          { label: 'Approval drawings', icon: 'document-text', go: pro('Approval drawings') },
        ],
      },
      {
        title: 'Interior designer',
        go: { href: '/professionals' },
        cards: [
          {
            label: 'Full home interiors',
            meta: 'Package',
            icon: 'home',
            go: pro('Full home interiors'),
          },
          {
            label: 'Modular kitchen design',
            icon: 'restaurant',
            go: pro('Modular kitchen design'),
          },
          { label: '3D room renders', icon: 'images', go: pro('3D room renders') },
        ],
      },
      {
        title: 'Civil engineer',
        go: { href: '/professionals' },
        cards: [
          { label: 'Cost estimate / BOQ', icon: 'calculator', go: pro('Cost estimate / BOQ') },
          { label: 'Site supervision', icon: 'eye', go: pro('Site supervision') },
          { label: 'Structural check', icon: 'git-network', go: pro('Structural check') },
        ],
      },
    ],
    banner: {
      eyebrow: 'New on Setu',
      title: 'Choose your own professional',
      body: 'See verified profiles, past work and reviews before you book.',
      go: { href: '/professionals' },
      after: 1,
    },
    cta: { label: 'Post a requirement', go: { req: 'consult' } },
  },
};

export const PILLAR_ORDER: PillarKey[] = [
  'build',
  'home',
  'materials',
  'equipment',
  'professionals',
];
/** Short names for the home screen's five pillar tiles. */
export const PILLAR_TILE: Record<PillarKey, MessageKey> = {
  build: 'Build & Renovate',
  home: 'Quick Home Services',
  materials: 'Material Suppliers',
  equipment: 'Equipment Rental',
  professionals: 'Find Professionals',
};
