import type { AuthTokens, CreateRequirementInput } from '@setu/schemas';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${BASE}/v1${path}`, {
      ...rest,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError('Could not reach Setu. Check your connection and try again.', 0, null);
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const b = body as { message?: unknown; errors?: { message: string }[] } | null;
    const msg =
      b?.errors?.[0]?.message ??
      (typeof b?.message === 'string'
        ? b.message
        : (b?.message as { message?: string })?.message) ??
      'Something went wrong';
    throw new ApiError(msg, res.status, body);
  }
  return body as T;
}

export interface Category {
  id: string;
  slug: string;
  requirementType: string;
  nameEn: string;
  nameHi: string;
}

export const api = {
  categories: () => call<Category[]>('/catalog/categories'),
  sendOtp: (phone: string) =>
    call<{ expiresInSeconds: number; resendAfterSeconds: number }>('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: (phone: string, code: string) =>
    call<AuthTokens>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, code }) }),
  createRequirement: (token: string, input: CreateRequirementInput) =>
    call<{ id: string; status: string; title: string }>('/requirements', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    }),
};
