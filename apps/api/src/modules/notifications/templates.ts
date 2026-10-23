import { formatINR, type JobState, type Locale, t } from '@setu/domain';

/**
 * Message templates. Each WhatsApp `name` must match a template approved in WhatsApp
 * Manager, with the same body variables in the same order (and quick-reply buttons for
 * lead_new). Push copy is written here and localised by the recipient's language.
 */
export type TemplateKey = 'lead_new' | 'quote_received' | 'hired' | 'job_update';

export type TemplateParams = {
  lead_new: {
    leadId: string;
    title: string;
    sector: string;
    distanceKm: string;
    budgetPaise?: number;
  };
  quote_received: { requirementId: string; title: string; partnerName: string; totalPaise: number };
  hired: { jobId: string; title: string; sector: string };
  job_update: { jobId: string; title: string; state: JobState };
};

interface Rendered {
  whatsapp?: { name: string; bodyParams: string[]; buttonPayloads?: string[] };
  push: { title: string; body: string; data: Record<string, string> };
}

type Copy = Record<Locale, (p: never) => { title: string; body: string }>;

const budget = (paise?: number) =>
  paise ? `up to ${formatINR(paise, { decimals: false })}` : 'open budget';

const COPY = {
  lead_new: {
    en: (p: TemplateParams['lead_new']) => ({
      title: `New lead in ${p.sector}`,
      body: `${p.title} · ${p.distanceKm} km away · ${budget(p.budgetPaise)}`,
    }),
    hi: (p: TemplateParams['lead_new']) => ({
      title: `${p.sector} में नया काम`,
      body: `${p.title} · ${p.distanceKm} किमी दूर`,
    }),
    hinglish: (p: TemplateParams['lead_new']) => ({
      title: `${p.sector} mein naya lead`,
      body: `${p.title} · ${p.distanceKm} km door`,
    }),
  },
  quote_received: {
    en: (p: TemplateParams['quote_received']) => ({
      title: 'New quote received',
      body: `${p.partnerName} quoted ${formatINR(p.totalPaise, { decimals: false })} for “${p.title}”`,
    }),
    hi: (p: TemplateParams['quote_received']) => ({
      title: 'नया कोटेशन मिला',
      body: `${p.partnerName}: ${formatINR(p.totalPaise, { decimals: false })} · “${p.title}”`,
    }),
    hinglish: (p: TemplateParams['quote_received']) => ({
      title: 'Naya quote aaya',
      body: `${p.partnerName} ne ${formatINR(p.totalPaise, { decimals: false })} quote kiya · “${p.title}”`,
    }),
  },
  hired: {
    en: (p: TemplateParams['hired']) => ({
      title: 'You’re hired!',
      body: `“${p.title}” in ${p.sector}. Open the app to schedule the visit.`,
    }),
    hi: (p: TemplateParams['hired']) => ({
      title: 'आपको काम मिल गया!',
      body: `“${p.title}” · ${p.sector}. विज़िट का समय तय करने के लिए ऐप खोलें।`,
    }),
    hinglish: (p: TemplateParams['hired']) => ({
      title: 'Aapko kaam mil gaya!',
      body: `“${p.title}” · ${p.sector}. Visit schedule karne ke liye app kholein.`,
    }),
  },
  job_update: {
    en: (p: TemplateParams['job_update']) => ({
      title: t('en').jobState[p.state],
      body: `“${p.title}”`,
    }),
    hi: (p: TemplateParams['job_update']) => ({
      title: t('hi').jobState[p.state],
      body: `“${p.title}”`,
    }),
    hinglish: (p: TemplateParams['job_update']) => ({
      title: t('hinglish').jobState[p.state],
      body: `“${p.title}”`,
    }),
  },
} satisfies Record<TemplateKey, Copy>;

export function render<K extends TemplateKey>(
  key: K,
  params: TemplateParams[K],
  locale: Locale,
): Rendered {
  const copy = (COPY[key][locale] ?? COPY[key].en) as (p: TemplateParams[K]) => {
    title: string;
    body: string;
  };
  const push = copy(params);
  switch (key) {
    case 'lead_new': {
      const p = params as TemplateParams['lead_new'];
      return {
        whatsapp: {
          name: 'setu_new_lead',
          bodyParams: [p.title, p.sector, p.distanceKm, budget(p.budgetPaise)],
          buttonPayloads: [`lead:${p.leadId}:accept`, `lead:${p.leadId}:decline`],
        },
        push: { ...push, data: { screen: 'lead', id: p.leadId } },
      };
    }
    case 'quote_received': {
      const p = params as TemplateParams['quote_received'];
      return {
        whatsapp: {
          name: 'setu_quote_received',
          bodyParams: [p.partnerName, formatINR(p.totalPaise, { decimals: false }), p.title],
        },
        push: { ...push, data: { screen: 'requirement', id: p.requirementId } },
      };
    }
    case 'hired': {
      const p = params as TemplateParams['hired'];
      return {
        whatsapp: { name: 'setu_hired', bodyParams: [p.title, p.sector] },
        push: { ...push, data: { screen: 'job', id: p.jobId } },
      };
    }
    case 'job_update': {
      const p = params as TemplateParams['job_update'];
      return {
        whatsapp: { name: 'setu_job_update', bodyParams: [p.title, t(locale).jobState[p.state]] },
        push: { ...push, data: { screen: 'job', id: p.jobId } },
      };
    }
  }
  throw new Error(`Unknown template ${String(key)}`);
}
