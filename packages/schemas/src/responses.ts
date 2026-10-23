import {
  JOB_EVENT_TYPES,
  JOB_STATES,
  LOCALES,
  REQUIREMENT_STATUSES,
  REQUIREMENT_TYPES,
  ROLES,
} from '@setu/domain';
import { z } from 'zod';
import { authTokensSchema } from './auth';
import { geoPointSchema } from './common';
import { WAITLIST_ROLES } from './waitlist';

/**
 * API response shapes. Each is a codec: the input side is the JSON on the wire (what the
 * OpenAPI spec and the generated client describe), the output side is what the server
 * code returns (Dates, Postgres decimals as strings). The API encodes through these, so
 * fields not listed here are never sent.
 */

/** ISO-8601 on the wire, Date in code. */
export const timestamp = z.codec(z.iso.datetime(), z.date(), {
  decode: (s) => new Date(s),
  encode: (d) => d.toISOString(),
});
/** Postgres numeric: a number on the wire, a string from the driver. */
const decimal = z.codec(z.number(), z.string(), {
  decode: (n) => String(n),
  encode: (s) => Number(s),
});
const uuid = z.uuid();
const paise = z.number().int();
const json = z.unknown();

// ---------- auth & profile ----------

export const otpSentResponse = z.object({
  expiresInSeconds: z.number().int(),
  resendAfterSeconds: z.number().int(),
});

export const tokenPairResponse = authTokensSchema.omit({ user: true });
export const authSessionResponse = authTokensSchema;

export const meResponse = z.object({
  id: uuid,
  phone: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  locale: z.enum(LOCALES),
  roles: z.array(z.enum(ROLES)),
  consentVersion: z.string().nullable(),
  createdAt: timestamp,
});

export const healthResponse = z.object({ status: z.literal('ok'), db: z.literal('up') });

export const categoryResponse = z.object({
  id: uuid,
  parentId: uuid.nullable(),
  slug: z.string(),
  requirementType: z.enum(REQUIREMENT_TYPES),
  nameEn: z.string(),
  nameHi: z.string(),
  icon: z.string().nullable(),
});

// ---------- requirements & jobs ----------

export const requirementResponse = z.object({
  id: uuid,
  customerId: uuid,
  orgId: uuid.nullable(),
  type: z.enum(REQUIREMENT_TYPES),
  categoryId: uuid.nullable(),
  title: z.string(),
  /** Shape depends on `type`; see `requirementDetailsSchemas`. */
  details: z.record(z.string(), json),
  addressId: uuid,
  budgetMinPaise: paise.nullable(),
  budgetMaxPaise: paise.nullable(),
  status: z.enum(REQUIREMENT_STATUSES),
  cancelReason: z.string().nullable(),
  matchedAt: timestamp.nullable(),
  firstQuoteAt: timestamp.nullable(),
  hiredAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const jobResponse = z.object({
  id: uuid,
  requirementId: uuid,
  quoteId: uuid.nullable(),
  customerId: uuid,
  partnerId: uuid,
  state: z.enum(JOB_STATES),
  agreedTotalPaise: paise,
  slotStart: timestamp.nullable(),
  startedAt: timestamp.nullable(),
  completedAt: timestamp.nullable(),
  closedAt: timestamp.nullable(),
  cancelledAt: timestamp.nullable(),
  disputedAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

/** A job as one participant sees it, with the actions open to them now. */
export const jobViewResponse = jobResponse.extend({
  viewerRole: z.enum(['customer', 'partner', 'ops', 'system']),
  availableActions: z.array(z.enum(JOB_EVENT_TYPES)),
});

/** The hire. `startCode` is shown to the customer once; the partner needs it to start. */
export const hireResponse = z.object({ job: jobResponse, startCode: z.string() });
export const startCodeResponse = z.object({ startCode: z.string() });

const actorType = z.enum(['customer', 'partner', 'ops', 'system']);

export const jobEventResponse = z.object({
  id: z.number().int(),
  jobId: uuid,
  event: z.string(),
  fromState: z.enum(JOB_STATES).nullable(),
  toState: z.enum(JOB_STATES),
  actorType,
  actorId: uuid.nullable(),
  payload: json,
  createdAt: timestamp,
});

// ---------- partners, leads & quotes ----------

const verificationStatus = z.enum(['pending', 'in_review', 'verified', 'rejected', 'suspended']);
const partnerTier = z.enum(['basic', 'verified', 'pro']);

export const partnerResponse = z.object({
  id: uuid,
  userId: uuid,
  displayName: z.string(),
  businessName: z.string().nullable(),
  trades: z.array(z.string()),
  gstin: z.string().nullable(),
  baseLocation: geoPointSchema.nullable(),
  serviceRadiusKm: z.number().int(),
  ratingAvg: decimal.nullable(),
  ratingCount: z.number().int(),
  avgResponseMinutes: z.number().int().nullable(),
  acceptanceRate: decimal.nullable(),
  tier: partnerTier,
  verificationStatus,
  leadCredits: z.number().int(),
  onboardedById: uuid.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

const leadStatus = z.enum(['sent', 'seen', 'quoted', 'declined', 'expired']);

export const leadResponse = z.object({
  id: uuid,
  requirementId: uuid,
  partnerId: uuid,
  status: leadStatus,
  creditsSpent: z.number().int(),
  matchScore: decimal.nullable(),
  sentAt: timestamp,
  seenAt: timestamp.nullable(),
  respondedAt: timestamp.nullable(),
});

/** A lead in the partner's inbox: the job, the area (never the exact address) and distance. */
export const leadInboxItemResponse = z.object({
  id: uuid,
  status: leadStatus,
  sentAt: timestamp,
  seenAt: timestamp.nullable(),
  requirement: requirementResponse.pick({
    id: true,
    type: true,
    title: true,
    details: true,
    status: true,
    budgetMinPaise: true,
    budgetMaxPaise: true,
    createdAt: true,
  }),
  area: z.object({ sector: z.string().nullable(), city: z.string(), pincode: z.string() }),
  distanceKm: z.number(),
  quoteId: uuid.nullable(),
});

const quoteStatus = z.enum(['draft', 'sent', 'accepted', 'rejected', 'withdrawn', 'expired']);

export const quoteRowResponse = z.object({
  id: uuid,
  leadId: uuid,
  requirementId: uuid,
  partnerId: uuid,
  status: quoteStatus,
  version: z.number().int(),
  subtotalPaise: paise,
  gstRate: z.number().int().nullable(),
  interState: z.boolean(),
  gstPaise: paise,
  totalPaise: paise,
  milestones: json,
  notes: z.string().nullable(),
  validUntil: timestamp.nullable(),
  sentAt: timestamp.nullable(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const quoteLineResponse = z.object({
  id: uuid,
  quoteId: uuid,
  description: z.string(),
  quantity: z.number(),
  unit: z.string().nullable(),
  unitPricePaise: paise,
  amountPaise: paise,
  sortOrder: z.number().int(),
});

export const quoteResponse = quoteRowResponse.extend({ items: z.array(quoteLineResponse) });

export const quoteMessageResponse = z.object({
  quoteId: uuid,
  version: z.number().int(),
  message: z.string().nullable(),
  authorId: uuid.nullable(),
  createdAt: timestamp,
});

/** Public partner card on a quote: no phone or exact location before hire. */
export const partnerCardResponse = z.object({
  id: uuid,
  displayName: z.string(),
  businessName: z.string().nullable(),
  trades: z.array(z.string()),
  tier: partnerTier,
  verificationStatus,
  ratingAvg: decimal.nullable(),
  ratingCount: z.number().int(),
  avgResponseMinutes: z.number().int().nullable(),
  gstRegistered: z.boolean(),
});

export const quoteDetailResponse = quoteResponse.extend({
  thread: z.array(quoteMessageResponse),
  partner: partnerCardResponse.nullable(),
});

export const quoteRevisionResponse = quoteMessageResponse.extend({ id: uuid, snapshot: json });

// ---------- payments ----------

const paymentStatus = z.enum(['created', 'captured', 'failed', 'refunded']);

export const paymentOrderResponse = z.object({
  paymentId: uuid,
  razorpayOrderId: z.string(),
  amountPaise: paise,
  currency: z.literal('INR'),
  /** Public Razorpay key for the checkout. */
  keyId: z.string(),
});

export const paymentVerifiedResponse = z.object({
  paymentId: uuid,
  status: paymentStatus,
  amountPaise: paise,
});

export const jobPaymentsResponse = z.object({
  agreedTotalPaise: paise,
  paidPaise: paise,
  outstandingPaise: paise,
  payments: z.array(
    z.object({
      id: uuid,
      amountPaise: paise,
      status: paymentStatus,
      method: z.string().nullable(),
      capturedAt: timestamp.nullable(),
      createdAt: timestamp,
    }),
  ),
});

export const ledgerBalancesResponse = z.object({
  accounts: z.array(
    z.object({
      account: z.string(),
      debitPaise: paise,
      creditPaise: paise,
      /** Credits minus debits. */
      balancePaise: paise,
    }),
  ),
  /** Always 0 when the books balance. */
  trialBalancePaise: paise,
});

// ---------- notifications & waitlist ----------

export const notificationResponse = z.object({
  id: uuid,
  channel: z.enum(['whatsapp', 'push', 'sms']),
  template: z.string(),
  params: json,
  status: z.enum(['queued', 'sent', 'failed', 'skipped']),
  createdAt: timestamp,
});

export const waitlistJoinedResponse = z.object({ ok: z.literal(true), id: uuid });

export const waitlistSignupResponse = z.object({
  id: uuid,
  name: z.string(),
  phone: z.string(),
  role: z.enum(WAITLIST_ROLES),
  sector: z.string().nullable(),
  interests: z.array(z.enum(REQUIREMENT_TYPES)),
  trade: z.string().nullable(),
  source: z.string().nullable(),
  consentedAt: timestamp,
  contactedAt: timestamp.nullable(),
  createdAt: timestamp,
});

export const waitlistPageResponse = z.object({
  total: z.number().int(),
  rows: z.array(waitlistSignupResponse),
});

export const waitlistSummaryResponse = z.object({
  byRole: z.array(z.object({ role: z.enum(WAITLIST_ROLES), n: z.number().int() })),
  bySector: z.array(z.object({ sector: z.string().nullable(), n: z.number().int() })),
});

/** Wire (JSON) type of a response schema. */
export type Wire<S extends z.ZodType> = z.input<S>;
