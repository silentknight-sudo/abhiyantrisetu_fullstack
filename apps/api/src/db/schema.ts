/**
 * Core schema for the Phase 0/1 core loop. Conventions:
 * - uuid primary keys (gen_random_uuid), timestamptz everywhere
 * - money as bigint paise (`*_paise`)
 * - geo as PostGIS geography (SRID 4326)
 * - enums sourced from @setu/domain so API, apps and DB agree
 * Later phases add projects, milestones, payments ledger, chat, reviews, KYC checks.
 */
import { JOB_STATES, LOCALES, REQUIREMENT_STATUSES, REQUIREMENT_TYPES, ROLES } from '@setu/domain';
import { sql } from 'drizzle-orm';
import {
  bigint,
  bigserial,
  type AnyPgColumn,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// ---------- PostGIS types ----------

export interface LatLng {
  lat: number;
  lng: number;
}

/** Parses a hex EWKB point as returned by Postgres for geography(Point). */
function parseEwkbPoint(hex: string): LatLng {
  const buf = Buffer.from(hex, 'hex');
  const le = buf.readUInt8(0) === 1;
  const type = le ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
  const offset = type & 0x20000000 ? 9 : 5; // skip SRID when present
  const x = le ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
  const y = le ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8);
  return { lat: y, lng: x };
}

/*
 * drizzle-kit quotes parameterised custom types ("geography(Point,4326)"), producing invalid
 * SQL, so columns are plain `geography` (SRID 4326 by default) and the shape is enforced by
 * a CHECK constraint next to each column — see geoShapeCheck.
 */
export const geoPoint = customType<{ data: LatLng; driverData: string }>({
  dataType: () => 'geography',
  toDriver: ({ lat, lng }) => `SRID=4326;POINT(${lng} ${lat})`,
  fromDriver: (v) => parseEwkbPoint(v),
});

/** Service areas. Written via ST_GeogFromText/GeoJSON in SQL; read back as raw EWKB. */
export const geoMultiPolygon = customType<{ data: string; driverData: string }>({
  dataType: () => 'geography',
});

function geoShapeCheck(name: string, column: AnyPgColumn, shape: 'POINT' | 'MULTIPOLYGON') {
  return check(
    name,
    sql`${column} IS NULL OR GeometryType(${column}::geometry) = ${sql.raw(`'${shape}'`)}`,
  );
}

// ---------- enums ----------

const tuple = <T extends readonly string[]>(xs: T) => xs as unknown as [T[number], ...T[number][]];

export const roleEnum = pgEnum('role', tuple(ROLES));
export const localeEnum = pgEnum('locale', tuple(LOCALES));
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deleted']);
export const orgKindEnum = pgEnum('org_kind', ['society', 'builder', 'vendor', 'contractor']);
export const orgMemberRoleEnum = pgEnum('org_member_role', ['owner', 'admin', 'member']);
export const requirementTypeEnum = pgEnum('requirement_type', tuple(REQUIREMENT_TYPES));
export const requirementStatusEnum = pgEnum('requirement_status', tuple(REQUIREMENT_STATUSES));
export const partnerTierEnum = pgEnum('partner_tier', ['basic', 'verified', 'pro']);
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'in_review',
  'verified',
  'rejected',
  'suspended',
]);
export const documentKindEnum = pgEnum('document_kind', [
  'aadhaar',
  'pan',
  'bank_account',
  'police_verification',
  'gst_certificate',
  'selfie',
  'other',
]);
export const documentStatusEnum = pgEnum('document_status', [
  'pending',
  'approved',
  'rejected',
  'expired',
]);
export const leadStatusEnum = pgEnum('lead_status', [
  'sent',
  'seen',
  'quoted',
  'declined',
  'expired',
]);
export const quoteStatusEnum = pgEnum('quote_status', [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'withdrawn',
  'expired',
]);
export const jobStateEnum = pgEnum('job_state', tuple(JOB_STATES));
export const actorTypeEnum = pgEnum('actor_type', ['customer', 'partner', 'ops', 'system']);
export const notificationChannelEnum = pgEnum('notification_channel', ['whatsapp', 'push', 'sms']);
export const notificationStatusEnum = pgEnum('notification_status', [
  'queued',
  'sent',
  'failed',
  'skipped',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'created',
  'captured',
  'failed',
  'refunded',
]);
export const waitlistRoleEnum = pgEnum('waitlist_role', [
  'customer',
  'provider',
  'supplier',
  'society',
]);

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const money = (name: string) => bigint(name, { mode: 'number' });

// ---------- identity ----------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** E.164, e.g. +919876543210 */
  phone: text('phone').notNull().unique(),
  name: text('name'),
  email: text('email'),
  locale: localeEnum('locale').notNull().default('en'),
  roles: roleEnum('roles')
    .array()
    .notNull()
    .default(sql`'{customer}'::role[]`),
  status: userStatusEnum('status').notNull().default('active'),
  /** Partner accounts are bound to one device; null for customers. */
  boundDeviceId: text('bound_device_id'),
  /** DPDP consent: which notice version the user accepted, and when. */
  consentVersion: text('consent_version'),
  consentedAt: timestamp('consented_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  /** WhatsApp Business rules: messages only after an explicit opt-in. */
  whatsappOptInAt: timestamp('whatsapp_opt_in_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  ...timestamps,
});

export const otpChallenges = pgTable(
  'otp_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: text('phone').notNull(),
    /** HMAC-SHA256(code, OTP_HASH_SECRET); the code itself is never stored. */
    codeHash: text('code_hash').notNull(),
    attempts: smallint('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('otp_challenges_phone_created_idx').on(t.phone, t.createdAt)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 of the opaque token. */
    tokenHash: text('token_hash').notNull().unique(),
    /** All rotations of one login share a family; reuse of a rotated token revokes the family. */
    familyId: uuid('family_id').notNull(),
    deviceId: text('device_id'),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('refresh_tokens_family_idx').on(t.familyId)],
);

// ---------- accounts & orgs ----------

export const orgs = pgTable('orgs', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: orgKindEnum('kind').notNull(),
  name: text('name').notNull(),
  gstin: text('gstin'),
  ...timestamps,
});

export const orgMembers = pgTable(
  'org_members',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => orgs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: orgMemberRoleEnum('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })],
);

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orgId: uuid('org_id').references(() => orgs.id),
    label: text('label'),
    line1: text('line1').notNull(),
    line2: text('line2'),
    sector: text('sector'),
    tower: text('tower'),
    flat: text('flat'),
    city: text('city').notNull(),
    pincode: text('pincode').notNull(),
    location: geoPoint('location').notNull(),
    ...timestamps,
  },
  (t) => [
    index('addresses_user_idx').on(t.userId),
    index('addresses_location_gix').using('gist', t.location),
    geoShapeCheck('addresses_location_point', t.location, 'POINT'),
  ],
);

// ---------- catalog ----------

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  slug: text('slug').notNull().unique(),
  requirementType: requirementTypeEnum('requirement_type').notNull(),
  nameEn: text('name_en').notNull(),
  nameHi: text('name_hi').notNull(),
  icon: text('icon'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
});

export const services = pgTable(
  'services',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    slug: text('slug').notNull().unique(),
    nameEn: text('name_en').notNull(),
    nameHi: text('name_hi').notNull(),
    /** e.g. "per visit", "per sqft", "per point" */
    unit: text('unit').notNull(),
    basePricePaise: money('base_price_paise').notNull(),
    gstRate: smallint('gst_rate').notNull().default(18),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [index('services_category_idx').on(t.categoryId)],
);

export const serviceVariants = pgTable('service_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceId: uuid('service_id')
    .notNull()
    .references(() => services.id, { onDelete: 'cascade' }),
  nameEn: text('name_en').notNull(),
  nameHi: text('name_hi').notNull(),
  pricePaise: money('price_paise').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

// ---------- partners ----------

export const partners = pgTable(
  'partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id),
    displayName: text('display_name').notNull(),
    businessName: text('business_name'),
    trades: text('trades')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    gstin: text('gstin'),
    baseLocation: geoPoint('base_location'),
    serviceRadiusKm: integer('service_radius_km').notNull().default(10),
    serviceArea: geoMultiPolygon('service_area'),
    ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }),
    ratingCount: integer('rating_count').notNull().default(0),
    avgResponseMinutes: integer('avg_response_minutes'),
    acceptanceRate: numeric('acceptance_rate', { precision: 5, scale: 4 }),
    tier: partnerTierEnum('tier').notNull().default('basic'),
    verificationStatus: verificationStatusEnum('verification_status').notNull().default('pending'),
    leadCredits: integer('lead_credits').notNull().default(0),
    onboardedById: uuid('onboarded_by_id').references(() => users.id), // field agent
    ...timestamps,
  },
  (t) => [
    index('partners_base_location_gix').using('gist', t.baseLocation),
    index('partners_service_area_gix').using('gist', t.serviceArea),
    index('partners_trades_gin').using('gin', t.trades),
    geoShapeCheck('partners_base_location_point', t.baseLocation, 'POINT'),
    geoShapeCheck('partners_service_area_multipolygon', t.serviceArea, 'MULTIPOLYGON'),
  ],
);

export const partnerDocuments = pgTable(
  'partner_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    kind: documentKindEnum('kind').notNull(),
    /** Key in the private KYC bucket. */
    fileKey: text('file_key'),
    /** Masked only, e.g. XXXX-XXXX-1234. Full Aadhaar is never stored. */
    maskedNumber: text('masked_number'),
    verificationRef: text('verification_ref'),
    status: documentStatusEnum('status').notNull().default('pending'),
    reviewedById: uuid('reviewed_by_id').references(() => users.id),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('partner_documents_partner_idx').on(t.partnerId)],
);

// ---------- requirements (unified request table) ----------

export const requirements = pgTable(
  'requirements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    orgId: uuid('org_id').references(() => orgs.id),
    type: requirementTypeEnum('type').notNull(),
    categoryId: uuid('category_id').references(() => categories.id),
    title: text('title').notNull(),
    /** Validated per `type` by @setu/schemas requirementDetailsSchemas. */
    details: jsonb('details').notNull(),
    addressId: uuid('address_id')
      .notNull()
      .references(() => addresses.id),
    budgetMinPaise: money('budget_min_paise'),
    budgetMaxPaise: money('budget_max_paise'),
    status: requirementStatusEnum('status').notNull().default('requested'),
    cancelReason: text('cancel_reason'),
    matchedAt: timestamp('matched_at', { withTimezone: true }),
    firstQuoteAt: timestamp('first_quote_at', { withTimezone: true }),
    hiredAt: timestamp('hired_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('requirements_customer_idx').on(t.customerId, t.createdAt),
    index('requirements_status_idx').on(t.status, t.type),
  ],
);

export const requirementEvents = pgTable(
  'requirement_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => requirements.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    fromStatus: requirementStatusEnum('from_status'),
    toStatus: requirementStatusEnum('to_status').notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    actorId: uuid('actor_id'),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('requirement_events_req_idx').on(t.requirementId, t.createdAt)],
);

// ---------- leads & quotes ----------

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => requirements.id, { onDelete: 'cascade' }),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id),
    status: leadStatusEnum('status').notNull().default('sent'),
    creditsSpent: integer('credits_spent').notNull().default(0),
    /** Rank score from matching, kept for later learning-to-rank. */
    matchScore: numeric('match_score', { precision: 8, scale: 4 }),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    seenAt: timestamp('seen_at', { withTimezone: true }),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('leads_requirement_partner_uq').on(t.requirementId, t.partnerId),
    index('leads_partner_idx').on(t.partnerId, t.sentAt),
  ],
);

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .unique()
      .references(() => leads.id),
    requirementId: uuid('requirement_id')
      .notNull()
      .references(() => requirements.id),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id),
    status: quoteStatusEnum('status').notNull().default('draft'),
    version: integer('version').notNull().default(1),
    subtotalPaise: money('subtotal_paise').notNull(),
    /** null when the partner quotes without GST. */
    gstRate: smallint('gst_rate'),
    interState: boolean('inter_state').notNull().default(false),
    gstPaise: money('gst_paise').notNull().default(0),
    totalPaise: money('total_paise').notNull(),
    /** Proposed milestones: [{ title, percent }]. */
    milestones: jsonb('milestones'),
    notes: text('notes'),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('quotes_requirement_idx').on(t.requirementId)],
);

export const quoteItems = pgTable('quote_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
  unit: text('unit'),
  unitPricePaise: money('unit_price_paise').notNull(),
  amountPaise: money('amount_paise').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/** Negotiation history: an immutable snapshot per version plus the message that prompted it. */
export const quoteRevisions = pgTable('quote_revisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  snapshot: jsonb('snapshot').notNull(),
  authorId: uuid('author_id').references(() => users.id),
  message: text('message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------- jobs: the hire event ----------

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requirementId: uuid('requirement_id')
      .notNull()
      .unique()
      .references(() => requirements.id),
    /** null for instant Home Services bookings at a catalog price. */
    quoteId: uuid('quote_id')
      .unique()
      .references(() => quotes.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id),
    state: jobStateEnum('state').notNull().default('hired'),
    agreedTotalPaise: money('agreed_total_paise').notNull(),
    /** HMAC of the 4-digit code the customer gives the partner on site. */
    startCodeHash: text('start_code_hash').notNull(),
    startCodeAttempts: smallint('start_code_attempts').notNull().default(0),
    slotStart: timestamp('slot_start', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    disputedAt: timestamp('disputed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('jobs_partner_idx').on(t.partnerId, t.state),
    index('jobs_customer_idx').on(t.customerId, t.state),
    index('jobs_completed_idx')
      .on(t.completedAt)
      .where(sql`${t.state} = 'completed'`),
  ],
);

export const jobEvents = pgTable(
  'job_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    fromState: jobStateEnum('from_state'),
    toState: jobStateEnum('to_state').notNull(),
    actorType: actorTypeEnum('actor_type').notNull(),
    actorId: uuid('actor_id'),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('job_events_job_idx').on(t.jobId, t.createdAt)],
);

// ---------- audit & analytics ----------

/** Append-only. Every admin/ops action writes a row. */
export const auditLog = pgTable(
  'audit_log',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    actorId: uuid('actor_id').references(() => users.id),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_log_entity_idx').on(t.entityType, t.entityId)],
);

export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: uuid('user_id'),
    name: text('name').notNull(),
    properties: jsonb('properties'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('events_name_time_idx').on(t.name, t.occurredAt)],
);

// ---------- pre-launch ----------

/** Early-access sign-ups from the website. One row per phone and role; repeats update it. */
export const waitlistSignups = pgTable(
  'waitlist_signups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    role: waitlistRoleEnum('role').notNull(),
    sector: text('sector'),
    interests: requirementTypeEnum('interests')
      .array()
      .notNull()
      .default(sql`'{}'::requirement_type[]`),
    trade: text('trade'),
    source: text('source'),
    /** DPDP consent: when the person agreed to be contacted. */
    consentedAt: timestamp('consented_at', { withTimezone: true }).notNull(),
    ip: text('ip'),
    /** Set when the person is invited or converted at launch. */
    contactedAt: timestamp('contacted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('waitlist_phone_role_uq').on(t.phone, t.role),
    index('waitlist_created_idx').on(t.createdAt),
  ],
);

// ---------- notifications ----------

/** Expo push tokens, one row per device install. */
export const pushTokens = pgTable(
  'push_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    platform: text('platform').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('push_tokens_user_idx').on(t.userId)],
);

/** Every outbound message, one row per channel, with its delivery outcome. */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    template: text('template').notNull(),
    params: jsonb('params').notNull(),
    status: notificationStatusEnum('status').notNull().default('queued'),
    attempts: smallint('attempts').notNull().default(0),
    providerRef: text('provider_ref'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => [
    index('notifications_user_idx').on(t.userId, t.createdAt),
    index('notifications_status_idx').on(t.status),
  ],
);

/** Inbound webhook deliveries (WhatsApp, Razorpay). The unique key makes handling idempotent. */
export const inboundWebhooks = pgTable(
  'inbound_webhooks',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('inbound_webhooks_provider_external_uq').on(t.provider, t.externalId)],
);

// ---------- payments ----------

/** One Razorpay order per payment attempt against a job. */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => users.id),
    amountPaise: money('amount_paise').notNull(),
    status: paymentStatusEnum('status').notNull().default('created'),
    razorpayOrderId: text('razorpay_order_id').notNull().unique(),
    razorpayPaymentId: text('razorpay_payment_id').unique(),
    method: text('method'),
    failureReason: text('failure_reason'),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index('payments_job_idx').on(t.jobId)],
);

/**
 * Double-entry ledger. Append-only (a database trigger rejects UPDATE and DELETE); each
 * transaction's lines share a txn_id and balance. Balances are sums per account.
 */
export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    txnId: uuid('txn_id').notNull(),
    kind: text('kind').notNull(),
    account: text('account').notNull(),
    debitPaise: money('debit_paise').notNull().default(0),
    creditPaise: money('credit_paise').notNull().default(0),
    jobId: uuid('job_id').references(() => jobs.id),
    paymentId: uuid('payment_id').references(() => payments.id),
    memo: text('memo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('ledger_account_idx').on(t.account),
    index('ledger_job_idx').on(t.jobId),
    index('ledger_txn_idx').on(t.txnId),
    check(
      'ledger_one_sided',
      sql`(${t.debitPaise} > 0 AND ${t.creditPaise} = 0) OR (${t.creditPaise} > 0 AND ${t.debitPaise} = 0)`,
    ),
  ],
);
