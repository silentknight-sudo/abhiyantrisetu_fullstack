'use client';

import { Notice, PageHeader, Stat } from '@/components/ui';
import { $api, errorMessage } from '@/lib/api';
import { rupees } from '@/lib/format';
import { useSession } from '@/lib/session';

export default function Overview() {
  const { can } = useSession();
  const o = $api.useQuery('get', '/v1/admin/overview');
  const d = o.data;
  return (
    <>
      <PageHeader
        title="Overview"
        lead="What needs attention today across partners, jobs and money."
      />
      {o.error ? <Notice>{errorMessage(o.error)}</Notice> : null}
      {d ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Partners to verify"
            value={d.partners.pending + d.partners.inReview}
            hint={`${d.partners.pending} new · ${d.partners.inReview} changed profile`}
            href={can('ops', 'verification') ? '/partners' : undefined}
          />
          <Stat
            label="Open disputes"
            value={d.disputedJobs}
            hint="Payment frozen until resolved"
            href={can('ops', 'support') ? '/disputes' : undefined}
          />
          <Stat
            label="Owed to partners"
            value={rupees(d.owedToPartnersPaise)}
            hint="Released, not yet paid out"
            href={can('ops', 'finance') ? '/payouts' : undefined}
          />
          <Stat
            label="Held for jobs"
            value={rupees(d.heldPaise)}
            hint="Customer money until each job closes"
          />
          <Stat label="Verified partners" value={d.partners.verified} />
          <Stat label="Open requirements" value={d.openRequirements} hint="Posted, not yet hired" />
          <Stat
            label="Active jobs"
            value={d.activeJobs}
            hint="Hired to completed"
            href={can('ops', 'support', 'finance') ? '/jobs' : undefined}
          />
          <Stat
            label="Waitlist"
            value={d.waitlist}
            hint="Early-access sign-ups"
            href={can('ops', 'support') ? '/waitlist' : undefined}
          />
        </div>
      ) : null}
    </>
  );
}
