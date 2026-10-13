import { z } from 'zod';

export const createPriceOfferSchema = z.object({
  amount: z.coerce.number().int().positive().max(999_999_999_999),
});

export const respondPriceOfferSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

export type PriceOfferResponse = z.infer<typeof respondPriceOfferSchema>['status'];
