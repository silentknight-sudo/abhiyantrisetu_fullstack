/**
 * The city service pages (/greater-noida/<slug>), modelled on how large home-services
 * marketplaces rank: one rich page per service and city, with a price list, the common jobs
 * people search for, FAQs, and links to every sector page for that service.
 *
 * Prices are indicative Greater Noida ranges before a site visit, matching Setu AI's rate card.
 */

export interface CityService {
  slug: string;
  name: string;
  /** Plural used in headings ("Plumbers in Greater Noida"). */
  plural: string;
  hindi: string;
  /** Group on the services index. */
  group: 'Home services' | 'Build & renovate' | 'Materials & equipment' | 'Professionals';
  /** One-line pitch, also the meta description lead. */
  summary: string;
  intro: string;
  /** Common jobs with an indicative price, shown as the rate list. */
  prices: [job: string, price: string][];
  faqs: [q: string, a: string][];
  /** Extra search phrases people use; worked into the page copy, not hidden. */
  searches: string[];
  /** Slug of the matching sector pages (/services/<trade>/<sector>), if any. */
  sectorTrade?: string;
  /** Requirement type for the "Get a quote" link. */
  postType: 'service' | 'renovation' | 'consult' | 'material_rfq' | 'equipment';
}

export const CITY = { name: 'Greater Noida', slug: 'greater-noida', hindi: 'ग्रेटर नोएडा' };

const verifiedFaq: [string, string] = [
  'Are the professionals verified?',
  'Yes. Every professional on Abhiyantri Setu completes Aadhaar and PAN checks, a bank account check and a selfie face match before getting leads. Site workers for construction jobs also go through police verification.',
];
const paymentFaq: [string, string] = [
  'How do I pay?',
  'You pay through Setu after you hire. The money is held safely and released to the professional only when you confirm the work is done. For larger projects, payment is released milestone by milestone.',
];

export const CITY_SERVICES: CityService[] = [
  {
    slug: 'plumber',
    name: 'Plumber',
    plural: 'Plumbers',
    hindi: 'प्लंबर',
    group: 'Home services',
    summary: 'Verified plumbers for leaks, taps, blockages, fittings and new pipelines.',
    intro:
      'From a dripping tap to a full bathroom pipeline, book a verified plumber near you in Greater Noida. Compare quotes, see the price before work starts, and pay only when the job is done.',
    prices: [
      ['Visit and inspection', '₹199–299'],
      ['Tap or mixer replacement', '₹400–900'],
      ['Blocked drain or basin', '₹350–800'],
      ['Flush tank repair', '₹350–700'],
      ['Water tank cleaning (1,000 L)', '₹600–900'],
      ['Concealed pipeline, per point', '₹900–1,600'],
    ],
    faqs: [
      [
        'How much does a plumber charge in Greater Noida?',
        'A visit usually costs ₹199–299, and small jobs like replacing a tap cost ₹400–900 including labour. Parts are extra and listed separately on the quote.',
      ],
      [
        'Can I get a plumber today?',
        'Yes. Post your requirement and choose "Right away" or "Today"; nearby plumbers are notified at once and urgent visits are often the same day.',
      ],
      verifiedFaq,
      paymentFaq,
    ],
    searches: [
      'plumber near me',
      'plumber in Greater Noida West',
      'leakage repair',
      'nal theek karne wala',
    ],
    sectorTrade: 'plumber',
    postType: 'service',
  },
  {
    slug: 'electrician',
    name: 'Electrician',
    plural: 'Electricians',
    hindi: 'इलेक्ट्रीशियन',
    group: 'Home services',
    summary: 'Verified electricians for wiring, switches, fans, lights, MCBs and inverters.',
    intro:
      'Book a verified electrician in Greater Noida for switchboards, fans, lights, MCB trips, inverter installation or complete house rewiring. Every job starts only after you share your start code.',
    prices: [
      ['Visit and inspection', '₹199–299'],
      ['Fan installation', '₹250–450'],
      ['Switchboard repair', '₹200–500'],
      ['MCB or DB replacement', '₹500–1,500'],
      ['Inverter installation', '₹600–1,200'],
      ['Full rewiring, 2BHK', '₹60,000–1,20,000'],
    ],
    faqs: [
      [
        'How much does an electrician charge in Greater Noida?',
        'A visit is usually ₹199–299. Installing a ceiling fan costs ₹250–450 and full rewiring of a 2BHK is about ₹60,000–1.2 lakh depending on the wiring brand and number of points.',
      ],
      [
        'What should I do if wires are sparking?',
        'Switch off the main supply at the MCB first, keep away from the wiring and book an electrician as "Right away". If there is a fire or smoke, call 112.',
      ],
      verifiedFaq,
      paymentFaq,
    ],
    searches: ['electrician near me', 'wiring work', 'bijli mistri', 'inverter installation'],
    sectorTrade: 'electrician',
    postType: 'service',
  },
  {
    slug: 'ac-repair',
    name: 'AC Repair & Service',
    plural: 'AC technicians',
    hindi: 'एसी रिपेयर',
    group: 'Home services',
    summary: 'AC service, gas filling, installation and repair for split and window ACs.',
    intro:
      'Keep cool through the Greater Noida summer. Book AC service, gas top-up, installation or repair for split and window ACs from verified technicians.',
    prices: [
      ['AC service (split or window)', '₹499–799'],
      ['Gas top-up', '₹1,800–3,000'],
      ['Split AC installation', '₹1,200–1,800'],
      ['Split AC uninstallation', '₹500–800'],
      ['PCB or capacitor repair', '₹800–3,500'],
    ],
    faqs: [
      [
        'How often should an AC be serviced?',
        'Twice a year: before summer and after the monsoon. Regular servicing keeps cooling strong and power bills lower.',
      ],
      [
        'How much does AC gas filling cost in Greater Noida?',
        'A gas top-up usually costs ₹1,800–3,000 depending on the gas type and how much is needed. The technician checks for leaks first.',
      ],
      verifiedFaq,
    ],
    searches: ['AC service near me', 'AC gas filling', 'split AC installation'],
    sectorTrade: 'ac-repair',
    postType: 'service',
  },
  {
    slug: 'carpenter',
    name: 'Carpenter',
    plural: 'Carpenters',
    hindi: 'बढ़ई',
    group: 'Home services',
    summary: 'Furniture repair, door and lock fixing, wardrobes and custom woodwork.',
    intro:
      'Find a verified carpenter in Greater Noida for door and lock repairs, furniture assembly, wardrobes, beds and custom woodwork, with a clear quote before work starts.',
    prices: [
      ['Visit and inspection', '₹249–349'],
      ['Door lock fitting', '₹300–600'],
      ['Furniture assembly', '₹500–1,500'],
      ['Wardrobe, per sq ft', '₹1,200–2,200'],
      ['Door installation', '₹1,500–3,000'],
    ],
    faqs: [
      [
        'Do carpenters bring their own material?',
        'For repairs they bring hardware like hinges and screws and list them on the quote. For new furniture you can choose the ply and laminate brand and the carpenter quotes per sq ft.',
      ],
      verifiedFaq,
      paymentFaq,
    ],
    searches: ['carpenter near me', 'wardrobe maker', 'furniture repair'],
    sectorTrade: 'carpenter',
    postType: 'service',
  },
  {
    slug: 'painter',
    name: 'House Painting',
    plural: 'Painters',
    hindi: 'पेंटर',
    group: 'Home services',
    summary: 'Interior and exterior painting, texture and putty work by verified painters.',
    intro:
      'Repaint your flat or house in Greater Noida with verified painters. Get a per sq ft quote with paint brand, coats and putty work listed line by line.',
    prices: [
      ['Interior repainting, per sq ft', '₹14–22'],
      ['Fresh painting with putty, per sq ft', '₹22–30'],
      ['Exterior painting, per sq ft', '₹18–32'],
      ['2BHK full repaint', '₹35,000–70,000'],
      ['Texture wall, per sq ft', '₹60–150'],
    ],
    faqs: [
      [
        'How much does it cost to paint a 2BHK in Greater Noida?',
        'Repainting a 2BHK usually costs ₹35,000–70,000 depending on the paint range, number of coats and how much putty and repair the walls need.',
      ],
      [
        'How long does painting take?',
        'A 2BHK repaint usually takes 4–6 days, including surface preparation, primer and two coats.',
      ],
      verifiedFaq,
      paymentFaq,
    ],
    searches: ['painter near me', 'house painting cost', 'wall putty', 'ghar ki putai'],
    sectorTrade: 'painter',
    postType: 'service',
  },
  {
    slug: 'waterproofing',
    name: 'Waterproofing',
    plural: 'Waterproofing experts',
    hindi: 'वॉटरप्रूफिंग',
    group: 'Home services',
    summary: 'Fix seepage, damp walls, roof leaks and bathroom leakage for good.',
    intro:
      'Seepage and damp walls are common in Greater Noida high-rises and houses. Get a waterproofing expert to find the source and fix it, with a written warranty on the treatment.',
    prices: [
      ['Inspection with moisture check', '₹299–499'],
      ['Bathroom waterproofing, per sq ft', '₹60–110'],
      ['Terrace waterproofing, per sq ft', '₹45–90'],
      ['Wall seepage treatment, per sq ft', '₹45–80'],
      ['Water tank waterproofing', '₹3,000–8,000'],
    ],
    faqs: [
      [
        'Why is there seepage on my wall?',
        'Usually from a leaking pipe or bathroom above or behind the wall, cracks in the external wall, or a terrace without proper waterproofing. An inspection finds the source before any treatment.',
      ],
      [
        'Is there a warranty on waterproofing?',
        'Most treatments come with a 2–10 year warranty depending on the method. The warranty is written on your quote.',
      ],
      verifiedFaq,
    ],
    searches: ['seepage repair', 'damp wall treatment', 'roof leakage repair', 'seelan ka ilaj'],
    sectorTrade: 'waterproofing',
    postType: 'service',
  },
  {
    slug: 'house-construction',
    name: 'House Construction',
    plural: 'House construction contractors',
    hindi: 'मकान निर्माण',
    group: 'Build & renovate',
    summary: 'Build your house with verified contractors and stage-wise payments.',
    intro:
      'Build your house in Greater Noida with a verified contractor. You get an engineer inspection at every stage, photo reports, and you release payment only stage by stage, from foundation to handover.',
    prices: [
      ['Basic finish, per sq ft built-up', '₹1,650'],
      ['Standard finish, per sq ft built-up', '₹1,950'],
      ['Premium finish, per sq ft built-up', '₹2,450'],
      ['Soil test', '₹15,000–30,000'],
      ['Structural design and drawings', '₹30–60 per sq ft'],
    ],
    faqs: [
      [
        'What is the construction cost per sq ft in Greater Noida?',
        'Around ₹1,650 per sq ft for a basic finish, ₹1,950 for standard and ₹2,450 for premium, excluding land, approvals and GST. Use the cost calculator on our home page for an estimate.',
      ],
      [
        'How are payments made during construction?',
        'In stages: foundation, plinth, each slab, brickwork, plaster and finishing. Each stage is inspected and photographed before you approve its payment.',
      ],
      [
        'How long does it take to build a house?',
        'A ground plus one house of about 1,200 sq ft per floor usually takes 8–12 months from foundation to handover.',
      ],
      verifiedFaq,
    ],
    searches: [
      'house construction contractor',
      'construction cost per sq ft',
      'ghar banane ka kharcha',
    ],
    postType: 'renovation',
  },
  {
    slug: 'home-renovation',
    name: 'Home Renovation',
    plural: 'Renovation contractors',
    hindi: 'घर का रेनोवेशन',
    group: 'Build & renovate',
    summary: 'Bathroom, kitchen, flooring and full-home renovation with milestone payments.',
    intro:
      'Renovate a bathroom, kitchen or your whole flat in Greater Noida. Compare itemised quotes from verified contractors and pay milestone by milestone.',
    prices: [
      ['Bathroom renovation (40 sq ft)', '₹1.1–1.6 lakh'],
      ['Kitchen renovation', '₹1.5–3.5 lakh'],
      ['Vitrified tile flooring, per sq ft', '₹110–180'],
      ['False ceiling, per sq ft', '₹85–140'],
      ['Full 2BHK renovation', '₹6–12 lakh'],
    ],
    faqs: [
      [
        'How much does bathroom renovation cost in Greater Noida?',
        'A 40 sq ft bathroom with mid-range tiles and fittings usually costs ₹1.1–1.6 lakh including demolition, plumbing, waterproofing and tiling.',
      ],
      paymentFaq,
      verifiedFaq,
    ],
    searches: ['bathroom renovation', 'flat renovation', 'renovation contractor near me'],
    postType: 'renovation',
  },
  {
    slug: 'interior-designer',
    name: 'Interior Design',
    plural: 'Interior designers',
    hindi: 'इंटीरियर डिज़ाइनर',
    group: 'Build & renovate',
    summary: 'Interior designers for flats, villas and offices, from design to execution.',
    intro:
      'Work with a verified interior designer in Greater Noida for 3D designs, material selection and complete execution of your flat, villa or office.',
    prices: [
      ['Design consultation', '₹1,500–5,000'],
      ['3D design, per room', '₹5,000–15,000'],
      ['2BHK full interiors', '₹5–12 lakh'],
      ['3BHK full interiors', '₹8–18 lakh'],
    ],
    faqs: [
      [
        'What does a 2BHK interior cost in Greater Noida?',
        'Full interiors for a 2BHK usually cost ₹5–12 lakh depending on the modular kitchen, wardrobes, false ceiling and finishes you choose.',
      ],
      verifiedFaq,
      paymentFaq,
    ],
    searches: ['interior designer near me', '2BHK interior cost', 'flat interior'],
    postType: 'consult',
  },
  {
    slug: 'modular-kitchen',
    name: 'Modular Kitchen',
    plural: 'Modular kitchen makers',
    hindi: 'मॉड्यूलर किचन',
    group: 'Build & renovate',
    summary: 'Custom modular kitchens with your choice of board, finish and hardware.',
    intro:
      'Get a modular kitchen designed and fitted in Greater Noida. Compare quotes with the board, finish and hardware brands listed, and pay in milestones.',
    prices: [
      ['L-shaped kitchen (10 ft)', '₹1.8–3.5 lakh'],
      ['Straight kitchen (8 ft)', '₹1.2–2.2 lakh'],
      ['Tall unit or pantry', '₹35,000–80,000'],
      ['Chimney and hob installation', '₹1,000–2,000'],
    ],
    faqs: [
      [
        'Which material is best for a modular kitchen?',
        'BWP plywood or HDHMR boards with acrylic, laminate or PU finishes are popular. Your quote lists the board and brand for each part.',
      ],
      verifiedFaq,
    ],
    searches: ['modular kitchen price', 'kitchen design', 'modular kitchen near me'],
    postType: 'renovation',
  },
  {
    slug: 'architect',
    name: 'Architect & Structural Engineer',
    plural: 'Architects and engineers',
    hindi: 'आर्किटेक्ट',
    group: 'Professionals',
    summary: 'House plans, structural design, approvals and site supervision.',
    intro:
      'Consult a verified architect or structural engineer in Greater Noida for house plans, structural design, GNIDA approvals, cracks and site supervision.',
    prices: [
      ['Consultation', '₹1,500–5,000'],
      ['House plan and elevation', '₹25–60 per sq ft'],
      ['Structural design', '₹15–30 per sq ft'],
      ['Crack or structural inspection', '₹3,000–10,000'],
    ],
    faqs: [
      [
        'Do I need an architect to build a house in Greater Noida?',
        'Yes, building plans submitted for approval to the Greater Noida authority must be prepared and signed by a registered architect, and a structural engineer designs the frame.',
      ],
      [
        'Can an engineer check cracks in my building?',
        'Yes. A structural engineer inspects the cracks, tells you whether they are cosmetic or structural, and recommends the repair.',
      ],
      verifiedFaq,
    ],
    searches: ['architect near me', 'structural engineer', 'house map design', 'naksha'],
    postType: 'consult',
  },
  {
    slug: 'civil-contractor',
    name: 'Civil Contractor',
    plural: 'Civil contractors',
    hindi: 'ठेकेदार',
    group: 'Build & renovate',
    summary: 'Masonry, plaster, RCC, boundary walls and labour-rate contracts.',
    intro:
      'Hire a verified civil contractor (thekedar) in Greater Noida for RCC, brickwork, plaster, boundary walls or a labour-rate contract for your house.',
    prices: [
      ['Labour rate, per sq ft built-up', '₹350–500'],
      ['Brickwork, per sq ft', '₹45–70'],
      ['Plaster, per sq ft', '₹25–40'],
      ['Boundary wall, per running ft', '₹1,200–2,200'],
    ],
    faqs: [
      [
        'What is a labour-rate contract?',
        'The contractor supplies labour and supervision while you buy the materials. Rates are per sq ft of built-up area, usually ₹350–500 in Greater Noida.',
      ],
      verifiedFaq,
      paymentFaq,
    ],
    searches: ['thekedar near me', 'civil contractor', 'labour rate contract'],
    postType: 'renovation',
  },
  {
    slug: 'building-materials',
    name: 'Building Materials',
    plural: 'Building material suppliers',
    hindi: 'निर्माण सामग्री',
    group: 'Materials & equipment',
    summary: 'Cement, TMT steel, sand, bricks, tiles and paint delivered to site.',
    intro:
      'Buy cement, TMT bars, sand, bricks, tiles and paint from verified suppliers in Greater Noida. Post your list once and compare delivered prices.',
    prices: [
      ['Cement (OPC 53, per bag)', '₹380–430'],
      ['TMT bars (per kg)', '₹62–70'],
      ['Red bricks (per 1,000)', '₹7,500–9,500'],
      ['Sand (per cubic ft)', '₹45–70'],
      ['Vitrified tiles (per sq ft)', '₹45–120'],
    ],
    faqs: [
      [
        'Is delivery included?',
        'Suppliers quote with delivery to your site and say whether unloading is included, so you can compare the real cost.',
      ],
      [
        'Can I get GST invoices?',
        'Yes. GST-registered suppliers show a GST badge and send a GST invoice for every order.',
      ],
    ],
    searches: ['cement price today', 'TMT bar rate', 'sariya rate', 'building material supplier'],
    postType: 'material_rfq',
  },
  {
    slug: 'jcb-equipment-rental',
    name: 'JCB & Equipment Rental',
    plural: 'Equipment rental providers',
    hindi: 'जेसीबी किराया',
    group: 'Materials & equipment',
    summary: 'JCB, concrete mixers, scaffolding and more, with or without operator.',
    intro:
      'Rent a JCB, concrete mixer, scaffolding or other equipment in Greater Noida, with or without an operator, by the hour or by the day.',
    prices: [
      ['JCB with operator (per hour)', '₹1,000–1,400'],
      ['Concrete mixer (per day)', '₹1,200–2,000'],
      ['Scaffolding (per sq ft per month)', '₹6–12'],
      ['Tractor trolley (per trip)', '₹1,500–2,500'],
    ],
    faqs: [
      [
        'Is the operator included?',
        'You choose. Quotes with an operator include their charges; machine-only rentals list the deposit and fuel terms.',
      ],
      verifiedFaq,
    ],
    searches: ['JCB on rent', 'JCB rate per hour', 'scaffolding on rent'],
    postType: 'equipment',
  },
];

export const findCityService = (slug: string) => CITY_SERVICES.find((s) => s.slug === slug);
