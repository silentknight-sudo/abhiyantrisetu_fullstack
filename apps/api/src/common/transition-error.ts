import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { TransitionResult } from '@setu/domain';

/** Maps a rejected state-machine transition to the right HTTP error. */
export function assertTransition<S>(
  res: TransitionResult<S>,
): asserts res is Extract<TransitionResult<S>, { ok: true }> {
  if (res.ok) return;
  const body = { code: res.code, message: res.message };
  switch (res.code) {
    case 'FORBIDDEN_ACTOR':
      throw new ForbiddenException(body);
    case 'GUARD_FAILED':
      throw new UnprocessableEntityException(body);
    default:
      throw new ConflictException(body);
  }
}
