import { describe, expect, it } from 'vitest';
import { presignS3 } from '../src/modules/storage/sigv4';

describe('presignS3', () => {
  it('matches the presigned URL in the AWS S3 documentation', () => {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html (example)
    const url = presignS3({
      method: 'GET',
      host: 'examplebucket.s3.amazonaws.com',
      key: 'test.txt',
      region: 'us-east-1',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      expiresIn: 86400,
      now: new Date('2013-05-24T00:00:00Z'),
    });
    expect(url).toBe(
      'https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404',
    );
  });

  it('signs extra headers and keeps slashes in keys', () => {
    const url = presignS3({
      method: 'PUT',
      host: 'setu-uploads.s3.ap-south-1.amazonaws.com',
      key: 'u/abc/requirement_photo/x y.jpg',
      region: 'ap-south-1',
      accessKeyId: 'AKID',
      secretAccessKey: 'secret',
      expiresIn: 600,
      now: new Date('2026-10-26T10:00:00Z'),
      signedHeaders: { 'Content-Type': 'image/jpeg' },
    });
    expect(url).toMatch(
      /^https:\/\/setu-uploads\.s3\.ap-south-1\.amazonaws\.com\/u\/abc\/requirement_photo\/x%20y\.jpg\?/,
    );
    expect(url).toContain('X-Amz-SignedHeaders=content-type%3Bhost');
  });
});
