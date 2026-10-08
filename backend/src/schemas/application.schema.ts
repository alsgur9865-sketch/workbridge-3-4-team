import { z } from 'zod';

export const APPLICATION_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'] as const;

export const projectIdParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export const applicationIdParamsSchema = z.object({
  applicationId: z.string().uuid(),
});

export const createApplicationSchema = z.object({
  introduction: z.string().trim().min(10).max(2000),
  proposedAmount: z.coerce.number().int().positive().max(999_999_999_999),
  estimatedDays: z.coerce.number().int().min(1).max(365),
});

export const applicationListQuerySchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type ApplicationDecision = z.infer<typeof updateApplicationStatusSchema>['status'];
