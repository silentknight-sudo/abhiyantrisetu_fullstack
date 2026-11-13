import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { PartnerDocKind } from '@setu/schemas';
import { and, asc, desc, eq, isNotNull, lte } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { auditLog, partnerDocuments, partners, users } from '../../db/schema';
import { StorageService } from '../storage/storage.service';
import { PartnersService } from './partners.service';

/** Trades that work inside customers' homes also need police verification. */
const IN_HOME = new Set([
  'plumber',
  'electrician',
  'carpenter',
  'painter',
  'ac-technician',
  'waterproofing',
  'tiler',
  'mason',
]);
const DAY_MS = 86_400_000;

type DocRow = typeof partnerDocuments.$inferSelect;
type PartnerRow = typeof partners.$inferSelect;

/** What a partner must provide, given their trades and GST registration. */
export function requiredDocs(p: Pick<PartnerRow, 'trades' | 'gstin'>): PartnerDocKind[] {
  const req: PartnerDocKind[] = ['aadhaar', 'pan', 'selfie', 'bank_account'];
  if (p.trades.some((t) => IN_HOME.has(t))) req.push('police_verification');
  if (p.gstin) req.push('gst_certificate');
  return req;
}

/** Partner KYC documents: upload (partner), review and expiry tracking (staff). */
@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PartnersService) private readonly partners: PartnersService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  private present(d: DocRow, withUrl: boolean) {
    // Whole calendar days from today to the expiry date (0 = expires today).
    const today = Date.parse(new Date().toISOString().slice(0, 10));
    const days = d.expiresAt
      ? Math.round((Date.parse(d.expiresAt.toISOString().slice(0, 10)) - today) / DAY_MS)
      : null;
    const expired = d.expiresAt ? d.expiresAt.getTime() < Date.now() : false;
    return {
      id: d.id,
      kind: d.kind,
      status: expired ? ('expired' as const) : d.status,
      expiresOn: d.expiresAt ? d.expiresAt.toISOString().slice(0, 10) : null,
      expiresInDays: days,
      note: d.rejectionReason,
      url: withUrl && d.fileKey ? (this.storage.viewUrls([d.fileKey])[0] ?? null) : null,
      updatedAt: d.updatedAt,
    };
  }

  private async summary(p: PartnerRow, withUrl: boolean) {
    const rows = await this.db
      .select()
      .from(partnerDocuments)
      .where(eq(partnerDocuments.partnerId, p.id))
      .orderBy(asc(partnerDocuments.kind), desc(partnerDocuments.createdAt));
    const required = requiredDocs(p);
    const valid = (k: string) => {
      const d = rows.find((r) => r.kind === k);
      return d && (!d.expiresAt || d.expiresAt.getTime() >= Date.now()) ? d : undefined;
    };
    const missing = required.filter((k) => !valid(k));
    return {
      documents: rows.map((r) => this.present(r, withUrl)),
      required,
      missing,
      steps: [
        { key: 'documents', done: missing.length === 0 },
        { key: 'review', done: required.every((k) => valid(k)?.status === 'approved') },
        { key: 'live', done: p.verificationStatus === 'verified' },
      ],
    };
  }

  async mine(user: AuthUser) {
    return this.summary(await this.partners.requireMine(user), true);
  }

  /** Upload or replace a document; a replacement goes back for review. */
  async upload(
    user: AuthUser,
    input: { kind: PartnerDocKind; fileKey: string; expiresOn?: string },
  ) {
    const me = await this.partners.requireMine(user);
    this.storage.assertOwned(user.id, 'partner_document', [input.fileKey]);
    if (input.expiresOn && new Date(`${input.expiresOn}T23:59:59Z`).getTime() < Date.now()) {
      throw new BadRequestException('This document has already expired; upload a current one');
    }
    const values = {
      fileKey: input.fileKey,
      expiresAt: input.expiresOn ? new Date(`${input.expiresOn}T23:59:59Z`) : null,
      status: 'pending' as const,
      rejectionReason: null,
      reviewedById: null,
      reviewedAt: null,
    };
    // One live document per kind: a re-upload replaces it and goes back for review.
    const [existing] = await this.db
      .select({ id: partnerDocuments.id })
      .from(partnerDocuments)
      .where(and(eq(partnerDocuments.partnerId, me.id), eq(partnerDocuments.kind, input.kind)));
    if (existing) {
      await this.db
        .update(partnerDocuments)
        .set(values)
        .where(eq(partnerDocuments.id, existing.id));
    } else {
      await this.db
        .insert(partnerDocuments)
        .values({ partnerId: me.id, kind: input.kind, ...values });
    }
    return this.summary(me, true);
  }

  // ---------- staff ----------

  async forPartner(partnerId: string) {
    const [p] = await this.db.select().from(partners).where(eq(partners.id, partnerId));
    if (!p) throw new NotFoundException();
    return this.summary(p, true);
  }

  async review(
    staff: AuthUser,
    docId: string,
    input: { status: 'approved' | 'rejected'; note?: string },
    ip: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [d] = await tx
        .select()
        .from(partnerDocuments)
        .where(eq(partnerDocuments.id, docId))
        .for('update');
      if (!d) throw new NotFoundException();
      const [after] = await tx
        .update(partnerDocuments)
        .set({
          status: input.status,
          rejectionReason: input.note ?? null,
          reviewedById: staff.id,
          reviewedAt: new Date(),
        })
        .where(eq(partnerDocuments.id, docId))
        .returning();
      await tx.insert(auditLog).values({
        actorId: staff.id,
        action: `document.${input.status}`,
        entityType: 'partner',
        entityId: d.partnerId,
        before: { kind: d.kind, status: d.status },
        after: { kind: d.kind, status: input.status, note: input.note ?? null },
        ip,
      });
      return this.present(after!, true);
    });
  }

  /** Documents that expire within `days` (or already have), soonest first. */
  async expiring(days: number) {
    const until = new Date(Date.now() + days * DAY_MS);
    const rows = await this.db
      .select({ doc: partnerDocuments, partnerName: partners.displayName, phone: users.phone })
      .from(partnerDocuments)
      .innerJoin(partners, eq(partners.id, partnerDocuments.partnerId))
      .innerJoin(users, eq(users.id, partners.userId))
      .where(and(isNotNull(partnerDocuments.expiresAt), lte(partnerDocuments.expiresAt, until)))
      .orderBy(asc(partnerDocuments.expiresAt))
      .limit(200);
    return rows.map((r) => ({
      ...this.present(r.doc, false),
      partnerId: r.doc.partnerId,
      partnerName: r.partnerName,
      phone: r.phone,
    }));
  }
}
