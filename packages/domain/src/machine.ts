/**
 * Minimal guarded transition table. Pure and synchronous: the backend calls `transition`
 * inside a DB transaction (row locked), persists `to`, and writes one event row per call.
 */
export type Actor = 'customer' | 'partner' | 'ops' | 'system';

export interface TransitionRule<S extends string, E extends { type: string }> {
  from: readonly S[];
  to: S;
  actors: readonly Actor[];
  /** Return an error message to reject, or null to allow. */
  guard?: (event: E) => string | null;
}

export type TransitionResult<S> =
  | { ok: true; from: S; to: S }
  | {
      ok: false;
      code: 'INVALID_TRANSITION' | 'FORBIDDEN_ACTOR' | 'GUARD_FAILED';
      message: string;
    };

export type TransitionTable<S extends string, E extends { type: string }> = {
  [K in E['type']]: TransitionRule<S, Extract<E, { type: K }>>;
};

export function createMachine<S extends string, E extends { type: string }>(
  table: TransitionTable<S, E>,
) {
  function rule(type: E['type']): TransitionRule<S, E> {
    return table[type as keyof typeof table] as unknown as TransitionRule<S, E>;
  }

  return {
    table,
    transition(from: S, event: E, actor: Actor): TransitionResult<S> {
      const r = rule(event.type);
      if (!r || !r.from.includes(from)) {
        return {
          ok: false,
          code: 'INVALID_TRANSITION',
          message: `Cannot '${event.type}' from '${from}'`,
        };
      }
      if (!r.actors.includes(actor)) {
        return {
          ok: false,
          code: 'FORBIDDEN_ACTOR',
          message: `'${actor}' may not '${event.type}'`,
        };
      }
      const err = r.guard?.(event);
      if (err) return { ok: false, code: 'GUARD_FAILED', message: err };
      return { ok: true, from, to: r.to };
    },
    /** Events `actor` could attempt from `state` (guards not evaluated). Drives UI buttons. */
    availableEvents(state: S, actor: Actor): E['type'][] {
      return (Object.keys(table) as E['type'][]).filter((t) => {
        const r = rule(t);
        return r.from.includes(state) && r.actors.includes(actor);
      });
    },
  };
}
