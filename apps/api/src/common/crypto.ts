import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function hmac(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Uniformly random numeric code with leading zeros, e.g. "004217". */
export function numericCode(digits: number): string {
  return randomInt(0, 10 ** digits)
    .toString()
    .padStart(digits, '0');
}

export function opaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}
