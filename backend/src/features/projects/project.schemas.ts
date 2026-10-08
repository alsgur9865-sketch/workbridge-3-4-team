import { z } from 'zod';

const isoDateString = z.string().datetime({ offset: true });

const projectFields = {
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(1).max(100),
  budget: z.coerce.number().positive().max(1_000_000_000),
  workStartAt: isoDateString,
  workEndAt: isoDateString,
  recruitmentStartAt: isoDateString.optional(),
  recruitmentDeadline: isoDateString,
  skills: z.array(z.string().trim().min(1).max(100)).max(10).default([]),
};

function validateProjectDates(
  value: {
    workStartAt?: string;
    workEndAt?: string;
    recruitmentStartAt?: string;
    recruitmentDeadline?: string;
  },
  context: z.RefinementCtx,
) {
  if (
    value.workStartAt &&
    value.workEndAt &&
    new Date(value.workStartAt) >= new Date(value.workEndAt)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['workEndAt'],
      message: '작업 종료일은 시작일보다 이후여야 합니다.',
    });
  }

  if (
    value.recruitmentStartAt &&
    value.recruitmentDeadline &&
    new Date(value.recruitmentStartAt) >= new Date(value.recruitmentDeadline)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['recruitmentDeadline'],
      message: '모집 마감일은 모집 시작일보다 이후여야 합니다.',
    });
  }

  if (
    value.recruitmentDeadline &&
    value.workStartAt &&
    new Date(value.recruitmentDeadline) > new Date(value.workStartAt)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['recruitmentDeadline'],
      message: '모집 마감일은 작업 시작일보다 늦을 수 없습니다.',
    });
  }
}

export const projectListQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    search: z.string().trim().max(100).optional(),
    category: z.string().trim().max(100).optional(),
    status: z.enum(['SCHEDULED', 'OPEN', 'CLOSED']).optional(),
    skill: z.string().trim().max(100).optional(),
    minBudget: z.coerce.number().nonnegative().optional(),
    maxBudget: z.coerce.number().positive().optional(),
    sort: z.enum(['newest', 'budgetLow', 'budgetHigh', 'deadline']).default('newest'),
    bookmarkedOnly: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default(false),
  })
  .superRefine((value, context) => {
    if (
      value.minBudget !== undefined &&
      value.maxBudget !== undefined &&
      value.minBudget > value.maxBudget
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxBudget'],
        message: '최대 예산은 최소 예산보다 크거나 같아야 합니다.',
      });
    }
  });

export const projectIdSchema = z.string().uuid();

export const createProjectSchema = z.object(projectFields).superRefine(validateProjectDates);

export const updateProjectSchema = z
  .object({
    ...projectFields,
    skills: projectFields.skills.optional(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: '수정할 내용을 하나 이상 입력해 주세요.',
  })
  .superRefine(validateProjectDates);

export const priceEstimateInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(1).max(100),
  estimatedDays: z.coerce.number().int().min(1).max(365),
  skills: z.array(z.string().trim().min(1).max(100)).min(1).max(10),
});

export const priceEstimateResultSchema = z.object({
  estimatedMinAmount: z.number().nonnegative(),
  estimatedMaxAmount: z.number().nonnegative(),
  estimatedTotalAmount: z.number().nonnegative(),
  currency: z.literal('KRW'),
  summary: z.string().min(1),
  factors: z.array(
    z.object({
      label: z.string().min(1),
      impact: z.enum(['increase', 'decrease', 'neutral']),
      reason: z.string().min(1),
    }),
  ),
  assumptions: z.array(z.string().min(1)),
});

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type PriceEstimateInput = z.infer<typeof priceEstimateInputSchema>;
export type PriceEstimateResult = z.infer<typeof priceEstimateResultSchema>;
