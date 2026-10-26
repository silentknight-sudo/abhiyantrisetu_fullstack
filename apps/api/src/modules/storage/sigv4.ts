import { createHash, createHmac } from 'node:crypto';

/** RFC 3986 encoding as SigV4 wants it (keeps `/` in paths when asked). */
function encode(s: string, keepSlash = false) {
  return encodeURIComponent(s)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(keepSlash ? /%2F/g : /$^/, '/');
}

const hmac = (key: Buffer | string, data: string) =>
  createHmac('sha256', key).update(data).digest();

export interface PresignInput {
  method: 'GET' | 'PUT';
  host: string;
  /** Object key, without a leading slash. */
  key: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiresIn: number;
  now?: Date;
  /** Extra headers the client must send exactly (e.g. content-type on uploads). */
  signedHeaders?: Record<string, string>;
}

/**
 * AWS Signature Version 4 query-string presigning for S3, without the AWS SDK.
 * https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
 */
export function presignS3(input: PresignInput): string {
  const now = input.now ?? new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${input.region}/s3/aws4_request`;
  const headers: Record<string, string> = { host: input.host };
  for (const [k, v] of Object.entries(input.signedHeaders ?? {}))
    headers[k.toLowerCase()] = v.trim();
  const headerNames = Object.keys(headers).sort();

  const query: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${input.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(input.expiresIn),
    'X-Amz-SignedHeaders': headerNames.join(';'),
  };
  if (input.sessionToken) query['X-Amz-Security-Token'] = input.sessionToken;
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encode(k)}=${encode(query[k]!)}`)
    .join('&');

  const path = `/${encode(input.key, true)}`;
  const canonicalRequest = [
    input.method,
    path,
    canonicalQuery,
    headerNames.map((h) => `${h}:${headers[h]}\n`).join(''),
    headerNames.join(';'),
    'UNSIGNED-PAYLOAD',
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, day), input.region), 's3'),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return `https://${input.host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
