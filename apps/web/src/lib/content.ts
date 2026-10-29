import type { RequirementType } from '@setu/domain';

export const SITE = {
  name: 'Abhiyantri Setu',
  tagline: 'The bridge between your home and the people who build it.',
  city: 'Greater Noida',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  phone: '+91 92895 53069',
  email: 'info@abhiyantrisetu.com',
  /** WhatsApp business number: quote requests from the website go here. */
  whatsapp: '919289553069',
  grievanceEmail: 'grievance@abhiyantrisetu.com',
};

export interface Flow {
  id: string;
  type: RequirementType;
  title: string;
  hindi: string;
  pitch: string;
  points: string[];
  cta: string;
  accent: 'navy' | 'orange';
}

/** The five customer flows from the prototype. */
export const FLOWS: Flow[] = [
  {
    id: 'home-services',
    type: 'service',
    title: 'Home Services',
    hindi: 'घरेलू सेवाएँ',
    pitch: 'Plumber, electrician, carpenter or AC repair. Book a slot in under a minute.',
    points: [
      'Fixed visit price up front',
      'Live “on the way” tracking',
      'Start code before work begins',
    ],
    cta: 'Book a pro',
    accent: 'orange',
  },
  {
    id: 'build-renovate',
    type: 'renovation',
    title: 'Build & Renovate',
    hindi: 'निर्माण और नवीनीकरण',
    pitch: 'From a new kitchen to a full house. Get a free site visit and compare quotes.',
    points: [
      'Free site visit',
      'Milestone payments with Setu Safe',
      '10-stage construction tracker',
    ],
    cta: 'Plan my project',
    accent: 'navy',
  },
  {
    id: 'find-pro',
    type: 'consult',
    title: 'Find a Professional',
    hindi: 'प्रोफेशनल खोजें',
    pitch:
      'Verified architects, structural engineers, interior designers and contractors near you.',
    points: ['KYC and police verified', 'Portfolio and real reviews', 'Response time shown'],
    cta: 'Browse pros',
    accent: 'orange',
  },
  {
    id: 'materials',
    type: 'material_rfq',
    title: 'Buy Materials',
    hindi: 'सामग्री खरीदें',
    pitch:
      'Upload your BOQ or a photo of your list. Suppliers quote line by line against market rates.',
    points: [
      'BOQ photo to line items with AI',
      'Market-rate comparison',
      'Site delivery with unloading',
    ],
    cta: 'Request a quote',
    accent: 'navy',
  },
  {
    id: 'equipment',
    type: 'equipment',
    title: 'Rent Equipment',
    hindi: 'उपकरण किराए पर',
    pitch: 'JCBs, mixers, scaffolding and shuttering, with or without an operator.',
    points: ['Daily work log', 'Verified operators', 'Hourly or daily rates'],
    cta: 'Rent now',
    accent: 'orange',
  },
];

export const STEPS = [
  {
    title: 'Post your requirement',
    body: 'Describe the job in English, Hindi or Hinglish. Add photos or just speak it. Setu AI fills in the details.',
    screen: 'post',
  },
  {
    title: 'Get 2+ quotes within 24 hours',
    body: 'We send it only to verified pros near your sector, ranked by distance, rating and response time.',
    screen: 'quotes',
  },
  {
    title: 'Compare, negotiate, hire',
    body: 'See line items, GST and proposed milestones side by side. Counter-offer in the app, then hire in one tap.',
    screen: 'compare',
  },
  {
    title: 'Work starts with your code',
    body: 'Your pro enters a 4-digit start code on site, so you always know when work has really begun.',
    screen: 'start',
  },
  {
    title: 'Pay per milestone, then review',
    body: 'With Setu Safe, money is released only when you approve a milestone. Disputes freeze payouts until resolved.',
    screen: 'pay',
  },
] as const;

export const CONSTRUCTION_STAGES = [
  'Soil test & design',
  'Excavation',
  'Foundation',
  'Plinth',
  'Columns & beams',
  'Slab casting',
  'Brickwork',
  'Plumbing & electrical',
  'Plaster & flooring',
  'Finishing & handover',
];

export const TRADES = [
  { slug: 'plumber', name: 'Plumber', plural: 'Plumbers', hindi: 'प्लंबर', from: 199 },
  {
    slug: 'electrician',
    name: 'Electrician',
    plural: 'Electricians',
    hindi: 'इलेक्ट्रीशियन',
    from: 199,
  },
  { slug: 'carpenter', name: 'Carpenter', plural: 'Carpenters', hindi: 'बढ़ई', from: 249 },
  { slug: 'painter', name: 'Painter', plural: 'Painters', hindi: 'पेंटर', from: 12 },
  {
    slug: 'ac-repair',
    name: 'AC Repair',
    plural: 'AC technicians',
    hindi: 'एसी रिपेयर',
    from: 399,
  },
  {
    slug: 'waterproofing',
    name: 'Waterproofing',
    plural: 'Waterproofing experts',
    hindi: 'वॉटरप्रूफिंग',
    from: 35,
  },
] as const;

export { SECTORS, type Sector } from '@setu/domain';
export type Trade = (typeof TRADES)[number];

export const FAQS = [
  {
    q: 'How are professionals verified?',
    a: 'Every partner completes Aadhaar (via DigiLocker) and PAN checks, a bank penny-drop and a selfie face match. Contractors and site workers also go through police verification. Badges on a profile show exactly which checks passed.',
  },
  {
    q: 'What is Setu Safe?',
    a: 'For projects, your payment for each milestone is held and released to the partner only after you approve that milestone with photos. If something goes wrong, raise a dispute and the payout stays frozen while our team reviews it.',
  },
  {
    q: 'Are prices final?',
    a: 'Home service visit charges are fixed. Estimates from calculators and Setu AI are indicative; the final price comes after a site visit and is shown line by line with GST before you hire.',
  },
  {
    q: 'Can I use Setu in Hindi?',
    a: 'Yes. The app works in English, Hindi and Hinglish, and you can speak your requirement instead of typing it.',
  },
  {
    q: 'I run a society/RWA. Can we book for all towers?',
    a: 'Yes. Societies get a single point of contact, tower-wise progress and recurring maintenance visits on one account.',
  },
  {
    q: 'How do I delete my account or data?',
    a: 'From Profile → Privacy in the app, or by writing to our grievance officer. We handle requests under the DPDP Act, 2023.',
  },
];

/** Indicative per-sqft construction rates for the calculator (labour + material, Greater Noida). */
export const BUILD_RATES = {
  basic: { label: 'Basic', perSqft: 1650 },
  standard: { label: 'Standard', perSqft: 1950 },
  premium: { label: 'Premium', perSqft: 2450 },
} as const;
