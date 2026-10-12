import type { JobState } from '../jobs';
import type { RequirementStatus, RequirementType } from '../requirements';

export const LOCALES = ['en', 'hi', 'hinglish'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Business strings shared by every surface. Screen copy lives in each app's i18next
 * namespace; anything here is a label the backend also emits (notifications, WhatsApp).
 */
export interface DomainStrings {
  jobState: Record<JobState, string>;
  requirementStatus: Record<RequirementStatus, string>;
  requirementType: Record<RequirementType, string>;
  otpSms: (code: string) => string;
  indicativeEstimate: string;
}

const en: DomainStrings = {
  jobState: {
    hired: 'Hired',
    scheduled: 'Scheduled',
    in_progress: 'Work in progress',
    completed: 'Work completed',
    closed: 'Closed',
    cancelled: 'Cancelled',
    disputed: 'Under review',
  },
  requirementStatus: {
    requested: 'Posted',
    matched: 'Finding professionals',
    quoted: 'Quotes received',
    hired: 'Hired',
    cancelled: 'Cancelled',
    expired: 'Expired',
  },
  requirementType: {
    service: 'Home service',
    renovation: 'Build & renovate',
    material_rfq: 'Buy materials',
    equipment: 'Rent equipment',
    consult: 'Expert consult',
  },
  otpSms: (code) => `${code} is your Abhiyantri Setu login code. Do not share it with anyone.`,
  indicativeEstimate: 'Indicative estimate. Final price after site visit.',
};

const hi: DomainStrings = {
  jobState: {
    hired: 'काम सौंपा गया',
    scheduled: 'समय तय',
    in_progress: 'काम चल रहा है',
    completed: 'काम पूरा हुआ',
    closed: 'बंद',
    cancelled: 'रद्द',
    disputed: 'जाँच में',
  },
  requirementStatus: {
    requested: 'पोस्ट किया गया',
    matched: 'प्रोफेशनल ढूँढ रहे हैं',
    quoted: 'कोटेशन मिले',
    hired: 'काम सौंपा गया',
    cancelled: 'रद्द',
    expired: 'समय समाप्त',
  },
  requirementType: {
    service: 'घरेलू सेवा',
    renovation: 'निर्माण और नवीनीकरण',
    material_rfq: 'सामग्री खरीदें',
    equipment: 'उपकरण किराए पर लें',
    consult: 'विशेषज्ञ सलाह',
  },
  otpSms: (code) => `${code} आपका अभियंत्री सेतु लॉगिन कोड है। इसे किसी के साथ साझा न करें।`,
  indicativeEstimate: 'अनुमानित कीमत। अंतिम कीमत साइट विज़िट के बाद।',
};

const hinglish: DomainStrings = {
  jobState: {
    hired: 'Hire ho gaya',
    scheduled: 'Time fix hai',
    in_progress: 'Kaam chal raha hai',
    completed: 'Kaam pura hua',
    closed: 'Closed',
    cancelled: 'Cancel ho gaya',
    disputed: 'Review mein hai',
  },
  requirementStatus: {
    requested: 'Post ho gaya',
    matched: 'Professionals dhoondh rahe hain',
    quoted: 'Quotes aa gaye',
    hired: 'Hire ho gaya',
    cancelled: 'Cancel ho gaya',
    expired: 'Expire ho gaya',
  },
  requirementType: {
    service: 'Home service',
    renovation: 'Build & renovate',
    material_rfq: 'Material kharidein',
    equipment: 'Equipment rent karein',
    consult: 'Expert salah',
  },
  otpSms: (code) => `${code} aapka Abhiyantri Setu login code hai. Kisi ke saath share na karein.`,
  indicativeEstimate: 'Andaazan keemat. Final price site visit ke baad.',
};

export const strings: Record<Locale, DomainStrings> = { en, hi, hinglish };

export function t(locale: Locale | null | undefined): DomainStrings {
  return strings[locale ?? 'en'] ?? en;
}
