import { z } from 'zod';

/** Ask for a signed upload slot for one photo. */
export const uploadRequestSchema = z.object({
  purpose: z.enum(['requirement_photo']),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic'], {
    error: 'Photos must be JPEG, PNG, WebP or HEIC',
  }),
  sizeBytes: z.number().int().positive(),
});
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
