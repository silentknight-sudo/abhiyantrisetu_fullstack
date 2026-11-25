import type { MessageKey } from '@/lib/i18n';

/**
 * What each kind of professional needs to know to quote without a call, by category
 * slug. Answers are saved in English (`details.answers`) and shown on the lead.
 */
export type Question =
  { q: MessageKey; options: MessageKey[] } | { q: MessageKey; input: 'number'; unit?: MessageKey };

export const QUESTIONS: Record<string, Question[]> = {
  plumbing: [
    {
      q: 'What needs fixing?',
      options: [
        'Leak',
        'Blocked drain',
        'Tap / mixer',
        'Toilet / flush',
        'New fitting',
        'Water tank / motor',
      ],
    },
    { q: 'Where?', options: ['Kitchen', 'Bathroom', 'Balcony', 'Outside / terrace'] },
    { q: 'How many points?', input: 'number' },
    { q: 'Parts and fittings', options: ['I have them', 'Professional brings them'] },
  ],
  electrical: [
    {
      q: 'What is the work?',
      options: [
        'Fan',
        'Switchboard / socket',
        'MCB tripping',
        'Light fitting',
        'Inverter',
        'New wiring',
      ],
    },
    { q: 'How many points?', input: 'number' },
    { q: 'Ceiling height', options: ['Normal', 'High (above 10 ft)'] },
    { q: 'Power right now', options: ['Working', 'Partly off', 'Fully off'] },
  ],
  carpentry: [
    {
      q: 'Which item?',
      options: [
        'Door / lock',
        'Bed',
        'Wardrobe',
        'Kitchen cabinet',
        'Furniture assembly',
        'Curtain rod',
      ],
    },
    { q: 'Repair or new?', options: ['Repair', 'New / install'] },
    { q: 'Material', options: ['I have it', 'Professional brings it'] },
  ],
  'ac-repair': [
    { q: 'AC type', options: ['Split', 'Window', 'Cassette'] },
    {
      q: 'What is the problem?',
      options: [
        'Service',
        'Not cooling',
        'Gas refill',
        'Install / uninstall',
        'Water leak',
        'Noise',
      ],
    },
    { q: 'How many ACs?', input: 'number' },
  ],
  painting: [
    { q: 'How much?', options: ['1 room', '1 BHK', '2 BHK', '3 BHK', 'Villa', 'Outside walls'] },
    { q: 'Wall condition', options: ['Good', 'Cracks or damp', 'New plaster'] },
    { q: 'Paint quality', options: ['Economy', 'Premium', 'Luxury', 'Not sure'] },
    { q: 'Furniture in the rooms?', options: ['Yes', 'Rooms are empty'] },
  ],
  waterproofing: [
    { q: 'Where?', options: ['Terrace', 'Bathroom', 'Wall seepage', 'Basement', 'Water tank'] },
    { q: 'Is it leaking now?', options: ['Yes', 'Only in rain', 'Not yet'] },
    { q: 'Area', input: 'number', unit: 'sq ft' },
    { q: 'Tiles on top?', options: ['Yes', 'No'] },
  ],
  'house-construction': [
    { q: 'Plot size', input: 'number', unit: 'sq yd' },
    { q: 'Floors', options: ['Ground only', 'G+1', 'G+2', 'G+3'] },
    { q: 'Drawings approved?', options: ['Yes', 'In progress', 'Not yet'] },
    { q: 'Scope', options: ['Full construction', 'Grey structure only', 'Labour only'] },
    { q: 'Basement?', options: ['Yes', 'No'] },
  ],
  renovation: [
    { q: 'Which rooms?', options: ['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Full home'] },
    { q: 'Building age', options: ['Under 5 years', '5–15 years', 'Over 15 years'] },
    { q: 'Will you live there during the work?', options: ['Yes', 'No'] },
  ],
  'modular-kitchen': [
    { q: 'Kitchen shape', options: ['L-shaped', 'U-shaped', 'Straight', 'Parallel', 'Island'] },
    { q: 'Kitchen length', input: 'number', unit: 'ft' },
    { q: 'Finish', options: ['Laminate', 'Acrylic', 'PU / lacquer', 'Not sure'] },
    { q: 'Appliances (hob, chimney)', options: ['Include in the quote', 'Not needed'] },
  ],
  'flooring-tiling': [
    {
      q: 'Which area?',
      options: ['Living room', 'Bedrooms', 'Kitchen', 'Bathroom', 'Balcony', 'Full home'],
    },
    { q: 'Current floor', options: ['Bare cement', 'Old tiles', 'Marble', 'Not sure'] },
    { q: 'Tile size', options: ['2×2 ft', '2×4 ft', '1×1 ft', 'Not decided'] },
  ],
  'structural-engineer': [
    {
      q: 'What do you need?',
      options: ['New design', 'Crack inspection', 'Extra floor check', 'Strengthening'],
    },
    { q: 'Building age', options: ['New / not built', 'Under 15 years', 'Over 15 years'] },
    { q: 'Floors', options: ['Ground only', 'G+1', 'G+2', 'G+3 or more'] },
  ],
  architect: [
    { q: 'Plot size', input: 'number', unit: 'sq yd' },
    { q: 'Floors planned', options: ['Ground only', 'G+1', 'G+2', 'G+3'] },
    {
      q: 'What do you need?',
      options: ['Plan & layout', '3D elevation', 'Approval drawings', 'Full design'],
    },
    { q: 'Plot facing', options: ['North', 'East', 'South', 'West', 'Not sure'] },
  ],
  'interior-designer': [
    { q: 'Home size', options: ['1 BHK', '2 BHK', '3 BHK', 'Villa', 'Office'] },
    { q: 'Scope', options: ['Full home', 'Kitchen', 'Wardrobes', 'Living room'] },
    { q: 'Style', options: ['Modern', 'Traditional', 'Minimal', 'Not sure'] },
    { q: 'Possession', options: ['Ready now', 'Within 3 months', 'Later'] },
  ],
  'civil-engineer': [
    {
      q: 'What do you need?',
      options: ['Cost estimate / BOQ', 'Site supervision', 'Quality check', 'Structural check'],
    },
    { q: 'Construction stage', options: ['Not started', 'Foundation', 'Structure', 'Finishing'] },
    { q: 'Built-up area', input: 'number', unit: 'sq ft' },
  ],
  'vastu-consultant': [
    { q: 'Property', options: ['Plot', 'Flat', 'House', 'Shop / office'] },
    { q: 'Stage', options: ['Buying', 'Planning', 'Already built'] },
    { q: 'How?', options: ['Site visit', 'Plan review only'] },
  ],
};
