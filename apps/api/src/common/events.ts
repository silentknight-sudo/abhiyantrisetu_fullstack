import type { JobState } from '@setu/domain';

/**
 * In-process domain events, emitted after the database transaction commits. Listeners
 * (notifications today; payouts, analytics later) must never be able to undo the action.
 */
export const DomainEvents = {
  LeadsCreated: 'leads.created',
  QuoteSent: 'quote.sent',
  QuoteRevised: 'quote.revised',
  JobHired: 'job.hired',
  JobTransitioned: 'job.transitioned',
} as const;

export interface LeadsCreatedEvent {
  requirementId: string;
  leadIds: string[];
}

export interface QuoteSentEvent {
  quoteId: string;
  requirementId: string;
  partnerId: string;
  totalPaise: number;
}

export interface JobHiredEvent {
  jobId: string;
  requirementId: string;
  customerId: string;
  partnerId: string;
}

export interface JobTransitionedEvent {
  jobId: string;
  event: string;
  from: JobState;
  to: JobState;
  customerId: string;
  partnerId: string;
  /** null for system transitions (auto-confirm). */
  actorUserId: string | null;
}
