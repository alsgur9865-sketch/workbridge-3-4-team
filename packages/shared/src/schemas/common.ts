import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const positiveMoneySchema = z.coerce.number().positive().max(999_999_999_999);
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
