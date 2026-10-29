import { z } from 'zod';

/** A Setu AI chat request: the conversation so far, oldest first, ending with the user. */
export const assistantChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20)
    .refine((m) => m[0]?.role === 'user' && m.at(-1)?.role === 'user', {
      message: 'The conversation must start and end with a user message',
    }),
});

export type AssistantChatInput = z.infer<typeof assistantChatSchema>;
