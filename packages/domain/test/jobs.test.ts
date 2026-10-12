import { describe, expect, it } from 'vitest';
import { AUTO_CONFIRM_AFTER_MS, jobMachine, requirementMachine } from '../src';

const now = new Date('2026-10-12T10:00:00Z');
const later = new Date('2026-10-13T10:00:00Z');

describe('jobMachine', () => {
  it('walks the happy path hired → closed', () => {
    const steps = [
      [
        jobMachine.transition('hired', { type: 'schedule', slotStart: later, now }, 'customer'),
        'scheduled',
      ],
      [
        jobMachine.transition('scheduled', { type: 'start', startCodeValid: true }, 'partner'),
        'in_progress',
      ],
      [jobMachine.transition('in_progress', { type: 'complete' }, 'partner'), 'completed'],
      [jobMachine.transition('completed', { type: 'confirm' }, 'customer'), 'closed'],
    ] as const;
    for (const [res, to] of steps) expect(res).toMatchObject({ ok: true, to });
  });

  it('rejects a wrong start code', () => {
    expect(
      jobMachine.transition('scheduled', { type: 'start', startCodeValid: false }, 'partner'),
    ).toMatchObject({
      ok: false,
      code: 'GUARD_FAILED',
    });
  });

  it('only lets the partner start the job', () => {
    expect(
      jobMachine.transition('scheduled', { type: 'start', startCodeValid: true }, 'customer'),
    ).toMatchObject({
      ok: false,
      code: 'FORBIDDEN_ACTOR',
    });
  });

  it('forbids cancelling once work has started', () => {
    expect(
      jobMachine.transition('in_progress', { type: 'cancel', reason: 'x' }, 'customer'),
    ).toMatchObject({
      ok: false,
      code: 'INVALID_TRANSITION',
    });
  });

  it('requires a cancel reason', () => {
    expect(jobMachine.transition('hired', { type: 'cancel', reason: '  ' }, 'customer').ok).toBe(
      false,
    );
  });

  it('auto-confirms only after 48 hours', () => {
    const completedAt = new Date(now.getTime() - AUTO_CONFIRM_AFTER_MS + 1000);
    expect(
      jobMachine.transition('completed', { type: 'auto_confirm', completedAt, now }, 'system').ok,
    ).toBe(false);
    const old = new Date(now.getTime() - AUTO_CONFIRM_AFTER_MS);
    expect(
      jobMachine.transition('completed', { type: 'auto_confirm', completedAt: old, now }, 'system'),
    ).toMatchObject({
      ok: true,
      to: 'closed',
    });
  });

  it('disputes freeze from in_progress and completed, resolved only by ops', () => {
    expect(
      jobMachine.transition('completed', { type: 'dispute', reason: 'leak' }, 'customer'),
    ).toMatchObject({ ok: true, to: 'disputed' });
    expect(jobMachine.transition('hired', { type: 'dispute', reason: 'leak' }, 'customer').ok).toBe(
      false,
    );
    expect(
      jobMachine.transition('disputed', { type: 'resolve_release', note: 'ok' }, 'customer').ok,
    ).toBe(false);
    expect(
      jobMachine.transition('disputed', { type: 'resolve_refund', note: 'refund' }, 'ops'),
    ).toMatchObject({ ok: true, to: 'cancelled' });
  });

  it('rejects scheduling in the past', () => {
    expect(
      jobMachine.transition('hired', { type: 'schedule', slotStart: now, now }, 'partner').ok,
    ).toBe(false);
  });

  it('lists available events per actor', () => {
    expect(jobMachine.availableEvents('scheduled', 'partner').sort()).toEqual([
      'cancel',
      'reschedule',
      'start',
    ]);
    expect(jobMachine.availableEvents('closed', 'ops')).toEqual([]);
  });
});

describe('requirementMachine', () => {
  it('requested → matched → quoted → hired', () => {
    expect(
      requirementMachine.transition('requested', { type: 'match', leadCount: 3 }, 'system'),
    ).toMatchObject({ ok: true, to: 'matched' });
    expect(
      requirementMachine.transition('matched', { type: 'receive_quote' }, 'system'),
    ).toMatchObject({ ok: true, to: 'quoted' });
    expect(
      requirementMachine.transition('quoted', { type: 'receive_quote' }, 'system'),
    ).toMatchObject({ ok: true, to: 'quoted' });
    expect(requirementMachine.transition('quoted', { type: 'hire' }, 'customer')).toMatchObject({
      ok: true,
      to: 'hired',
    });
  });

  it('cannot hire without a quote', () => {
    expect(requirementMachine.transition('matched', { type: 'hire' }, 'customer').ok).toBe(false);
  });
});
