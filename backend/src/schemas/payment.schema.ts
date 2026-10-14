import { z } from 'zod';

export const paymentIdParamsSchema = z.object({
  paymentId: z.string().uuid(),
});

export const confirmPaymentSchema = z.object({
  paymentKey: z.string().trim().min(1).max(200),
  orderId: z
    .string()
    .trim()
    .min(6)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid orderId format.'),
  amount: z.number().int().positive(),
});

export type ConfirmPaymentInput = z.infer<typeof confirmPaymentSchema>;
