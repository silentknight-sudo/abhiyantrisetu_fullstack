/**
 * Idempotent catalog seed (top-level categories from the prototype). Safe to re-run.
 * Usage: DATABASE_URL=... pnpm db:seed
 */
import type { RequirementType } from '@setu/domain';
import { createDb } from './client';
import { categories } from './schema';

const CATEGORIES: { slug: string; type: RequirementType; en: string; hi: string; icon: string }[] =
  [
    { slug: 'plumbing', type: 'service', en: 'Plumbing', hi: 'प्लंबिंग', icon: 'droplet' },
    { slug: 'electrical', type: 'service', en: 'Electrical', hi: 'बिजली का काम', icon: 'zap' },
    { slug: 'carpentry', type: 'service', en: 'Carpentry', hi: 'बढ़ईगीरी', icon: 'hammer' },
    { slug: 'painting', type: 'service', en: 'Painting', hi: 'पेंटिंग', icon: 'paint-roller' },
    {
      slug: 'waterproofing',
      type: 'service',
      en: 'Waterproofing & seepage',
      hi: 'वॉटरप्रूफिंग और सीलन',
      icon: 'umbrella',
    },
    { slug: 'ac-repair', type: 'service', en: 'AC repair', hi: 'एसी रिपेयर', icon: 'wind' },
    {
      slug: 'house-construction',
      type: 'renovation',
      en: 'House construction',
      hi: 'घर निर्माण',
      icon: 'home',
    },
    { slug: 'renovation', type: 'renovation', en: 'Renovation', hi: 'नवीनीकरण', icon: 'wrench' },
    {
      slug: 'modular-kitchen',
      type: 'renovation',
      en: 'Modular kitchen',
      hi: 'मॉड्यूलर किचन',
      icon: 'utensils',
    },
    {
      slug: 'flooring-tiling',
      type: 'renovation',
      en: 'Flooring & tiling',
      hi: 'फ़्लोरिंग और टाइलिंग',
      icon: 'grid',
    },
    {
      slug: 'cement-steel',
      type: 'material_rfq',
      en: 'Cement & steel',
      hi: 'सीमेंट और सरिया',
      icon: 'package',
    },
    {
      slug: 'sand-aggregate',
      type: 'material_rfq',
      en: 'Sand & aggregate',
      hi: 'रेत और गिट्टी',
      icon: 'mountain',
    },
    {
      slug: 'bricks-blocks',
      type: 'material_rfq',
      en: 'Bricks & blocks',
      hi: 'ईंट और ब्लॉक',
      icon: 'layers',
    },
    {
      slug: 'earthmoving',
      type: 'equipment',
      en: 'JCB & earthmoving',
      hi: 'जेसीबी और खुदाई',
      icon: 'truck',
    },
    {
      slug: 'concrete-equipment',
      type: 'equipment',
      en: 'Mixers & concrete',
      hi: 'मिक्सर और कंक्रीट',
      icon: 'cog',
    },
    {
      slug: 'scaffolding',
      type: 'equipment',
      en: 'Scaffolding & shuttering',
      hi: 'मचान और शटरिंग',
      icon: 'columns',
    },
    {
      slug: 'structural-engineer',
      type: 'consult',
      en: 'Structural engineer',
      hi: 'स्ट्रक्चरल इंजीनियर',
      icon: 'ruler',
    },
    { slug: 'architect', type: 'consult', en: 'Architect', hi: 'आर्किटेक्ट', icon: 'compass' },
    {
      slug: 'interior-designer',
      type: 'consult',
      en: 'Interior designer',
      hi: 'इंटीरियर डिज़ाइनर',
      icon: 'sofa',
    },
  ];

export async function seed(url: string) {
  const { db, sql } = createDb(url, { max: 1 });
  try {
    for (const [i, c] of CATEGORIES.entries()) {
      await db
        .insert(categories)
        .values({
          slug: c.slug,
          requirementType: c.type,
          nameEn: c.en,
          nameHi: c.hi,
          icon: c.icon,
          sortOrder: i,
        })
        .onConflictDoUpdate({
          target: categories.slug,
          set: { nameEn: c.en, nameHi: c.hi, icon: c.icon, sortOrder: i, requirementType: c.type },
        });
    }
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  seed(url)
    .then(() => console.log(`Seeded ${CATEGORIES.length} categories`))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
