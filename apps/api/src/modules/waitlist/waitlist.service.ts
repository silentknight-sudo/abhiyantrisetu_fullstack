import { Inject, Injectable } from '@nestjs/common';
import type { WaitlistRole, WaitlistSignupInput } from '@setu/schemas';
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import type { Db } from '../../db/client';
import { DB } from '../../db/db.module';
import { events, waitlistSignups } from '../../db/schema';

export interface WaitlistFilter {
  role?: WaitlistRole;
  sector?: string;
}

const CSV_COLUMNS = [
  'created_at',
  'name',
  'phone',
  'role',
  'sector',
  'trade',
  'interests',
  'source',
  'contacted_at',
] as const;

/** Quotes a CSV cell and neutralises spreadsheet formula injection. */
function csvCell(value: unknown): string {
  let s = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

@Injectable()
export class WaitlistService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Adds or refreshes a sign-up (one per phone and role). */
  async signUp(input: WaitlistSignupInput, ip?: string) {
    const now = new Date();
    const values = {
      name: input.name,
      phone: input.phone,
      role: input.role,
      sector: input.sector,
      interests: input.interests,
      trade: input.trade,
      source: input.source,
      consentedAt: now,
      ip,
    };
    const [row] = await this.db
      .insert(waitlistSignups)
      .values(values)
      .onConflictDoUpdate({
        target: [waitlistSignups.phone, waitlistSignups.role],
        set: { ...values, updatedAt: now },
      })
      .returning({ id: waitlistSignups.id, createdAt: waitlistSignups.createdAt });
    await this.db.insert(events).values({
      name: 'waitlist_signup',
      properties: { role: input.role, sector: input.sector ?? null, source: input.source ?? null },
    });
    return { ok: true as const, id: row!.id };
  }

  private where(f: WaitlistFilter): SQL | undefined {
    const parts: SQL[] = [];
    if (f.role) parts.push(eq(waitlistSignups.role, f.role));
    if (f.sector) parts.push(eq(waitlistSignups.sector, f.sector));
    return parts.length ? and(...parts) : undefined;
  }

  async list(f: WaitlistFilter, limit = 200, offset = 0) {
    const where = this.where(f);
    const [rows, [total]] = await Promise.all([
      this.db
        .select()
        .from(waitlistSignups)
        .where(where)
        .orderBy(desc(waitlistSignups.createdAt))
        .limit(limit)
        .offset(offset),
      this.db.select({ n: count() }).from(waitlistSignups).where(where),
    ]);
    return { total: total?.n ?? 0, rows };
  }

  /** Counts by role and by sector, for a quick demand picture. */
  async summary() {
    const byRole = await this.db
      .select({ role: waitlistSignups.role, n: count() })
      .from(waitlistSignups)
      .groupBy(waitlistSignups.role);
    const bySector = await this.db
      .select({ sector: waitlistSignups.sector, n: count() })
      .from(waitlistSignups)
      .groupBy(waitlistSignups.sector)
      .orderBy(desc(count()));
    return { byRole, bySector };
  }

  async csv(f: WaitlistFilter): Promise<string> {
    const rows = await this.db
      .select()
      .from(waitlistSignups)
      .where(this.where(f))
      .orderBy(desc(waitlistSignups.createdAt));
    const lines = [CSV_COLUMNS.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.createdAt,
          r.name,
          r.phone,
          r.role,
          r.sector,
          r.trade,
          r.interests.join(' '),
          r.source,
          r.contactedAt,
        ]
          .map(csvCell)
          .join(','),
      );
    }
    return lines.join('\n') + '\n';
  }
}
