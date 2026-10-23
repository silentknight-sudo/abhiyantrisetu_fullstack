import { ApiError } from '@setu/api-client';

type Body = { message?: unknown; errors?: { message?: string }[] };

/** A message fit to show the user, for any thrown value or API error body. */
export function errorMessage(err: unknown): string {
  const body = (err instanceof ApiError ? err.body : err) as Body | null | undefined;
  const firstIssue = body?.errors?.[0]?.message;
  if (firstIssue) return firstIssue;
  if (body && typeof body.message === 'string') return body.message;
  if (body && Array.isArray(body.message)) return body.message.join(', ');
  if (err instanceof TypeError) return 'Could not reach Abhiyantri Setu. Check your connection.';
  return 'Something went wrong. Please try again.';
}
