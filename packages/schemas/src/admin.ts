import { z } from 'zod';

/** Record a payout made outside Setu (bank transfer, UPI) against what a partner is owed. */
export const recordPayoutSchema = z.object({
  partnerId: z.uuid(),
  amountPaise: z.number().int().positive(),
  reference: z.string().trim().min(3, 'Add the bank or UPI reference').max(120),
});
