/**
 * Normalises an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts "98xxxxxxxx", "098xxxxxxxx", "+91 98xxx xxxxx", "91-98xxxxxxxx".
 * Returns null when the input is not a valid Indian mobile number.
 */
export function normalizeIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

/** "+919876543210" → "+91 98XXXXXX10". Used wherever partners see a customer pre-hire. */
export function maskPhone(e164: string): string {
  const local = e164.replace(/^\+91/, '');
  if (local.length !== 10) return '••••••••••';
  return `+91 ${local.slice(0, 2)}XXXXXX${local.slice(8)}`;
}
