import { z } from 'zod';

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Pick 1 to 5 stars').max(5, 'Pick 1 to 5 stars'),
  comment: z.string().trim().max(1000).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const reviewReplySchema = z.object({
  reply: z.string().trim().min(2, 'Write a short reply').max(1000),
});
