import { createMachine } from './machine';
import type { RequirementStatus } from './requirements';

/**
 * Job lifecycle (doc steps 4–8 plus side exits). A `jobs` row is the hire event and is
 * created in `hired`. Transitions happen only in the API's Jobs module via this table.
 */
export const JOB_STATES = [
  'hired',
  'scheduled',
  'in_progress',
  'completed',
  'closed',
  'cancelled',
  'disputed',
] as const;

export type JobState = (typeof JOB_STATES)[number];

export const TERMINAL_JOB_STATES: readonly JobState[] = ['closed', 'cancelled'];

/** Customer confirmation window after the partner marks the job done. */
export const AUTO_CONFIRM_AFTER_MS = 48 * 60 * 60 * 1000;

export type JobEvent =
  | { type: 'schedule'; slotStart: Date; now: Date }
  | { type: 'reschedule'; slotStart: Date; now: Date }
  | { type: 'start'; startCodeValid: boolean }
  | { type: 'complete' }
  | { type: 'confirm' }
  | { type: 'auto_confirm'; completedAt: Date; now: Date }
  | { type: 'cancel'; reason: string }
  | { type: 'dispute'; reason: string }
  | { type: 'resolve_release'; note: string }
  | { type: 'resolve_refund'; note: string };

export type JobEventType = JobEvent['type'];

const futureSlot = (e: { slotStart: Date; now: Date }) =>
  e.slotStart.getTime() > e.now.getTime() ? null : 'Slot must be in the future';

const nonEmpty = (field: string) => (e: Record<string, unknown>) =>
  typeof e[field] === 'string' && (e[field] as string).trim().length > 0
    ? null
    : `A ${field} is required`;

export const jobMachine = createMachine<JobState, JobEvent>({
  schedule: {
    from: ['hired'],
    to: 'scheduled',
    actors: ['customer', 'partner', 'ops'],
    guard: futureSlot,
  },
  reschedule: {
    from: ['scheduled'],
    to: 'scheduled',
    actors: ['customer', 'partner', 'ops'],
    guard: futureSlot,
  },
  start: {
    from: ['scheduled'],
    to: 'in_progress',
    actors: ['partner'],
    guard: (e) => (e.startCodeValid ? null : 'Start code does not match'),
  },
  complete: { from: ['in_progress'], to: 'completed', actors: ['partner'] },
  confirm: { from: ['completed'], to: 'closed', actors: ['customer', 'ops'] },
  auto_confirm: {
    from: ['completed'],
    to: 'closed',
    actors: ['system'],
    guard: (e) =>
      e.now.getTime() - e.completedAt.getTime() >= AUTO_CONFIRM_AFTER_MS
        ? null
        : 'Confirmation window has not elapsed',
  },
  cancel: {
    from: ['hired', 'scheduled'],
    to: 'cancelled',
    actors: ['customer', 'partner', 'ops'],
    guard: nonEmpty('reason'),
  },
  dispute: {
    from: ['in_progress', 'completed'],
    to: 'disputed',
    actors: ['customer', 'partner'],
    guard: nonEmpty('reason'),
  },
  resolve_release: { from: ['disputed'], to: 'closed', actors: ['ops'], guard: nonEmpty('note') },
  resolve_refund: { from: ['disputed'], to: 'cancelled', actors: ['ops'], guard: nonEmpty('note') },
});

/** Payout is frozen while disputed and released only on `closed`. */
export function isPayoutReleasable(state: JobState): boolean {
  return state === 'closed';
}

export type RequirementEvent =
  | { type: 'match'; leadCount: number }
  | { type: 'receive_quote' }
  | { type: 'hire' }
  | { type: 'cancel'; reason: string }
  | { type: 'expire' };

export const requirementMachine = createMachine<RequirementStatus, RequirementEvent>({
  match: {
    from: ['requested'],
    to: 'matched',
    actors: ['system', 'ops'],
    guard: (e) => (e.leadCount > 0 ? null : 'No partners matched'),
  },
  // The first quote moves matched → quoted; later quotes keep it in quoted.
  receive_quote: { from: ['matched', 'quoted'], to: 'quoted', actors: ['system'] },
  hire: { from: ['quoted'], to: 'hired', actors: ['customer', 'ops'] },
  cancel: {
    from: ['requested', 'matched', 'quoted'],
    to: 'cancelled',
    actors: ['customer', 'ops'],
    guard: nonEmpty('reason'),
  },
  expire: { from: ['requested', 'matched', 'quoted'], to: 'expired', actors: ['system'] },
});
