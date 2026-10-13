import { z } from 'zod';

const optionalNullableUrl = z
  .union([z.string().trim().url().max(2048), z.literal(''), z.null()])
  .optional();

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    bio: z.union([z.string().trim().max(1000), z.null()]).optional(),
    profileImageUrl: optionalNullableUrl,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'At least one field is required.',
  });

export const updateClientProfileSchema = z.object({
  companyName: z.string().trim().min(1).max(150),
  industry: z.string().trim().min(1).max(100),
  websiteUrl: optionalNullableUrl,
});

export const updateFreelancerProfileSchema = z.object({
  mainCategory: z.enum(['Web Development', 'Design', 'Marketing', 'Other']),
  careerYears: z.number().int().min(0).max(50),
  desiredRate: z.number().int().positive().max(1_000_000_000),
  portfolioUrl: optionalNullableUrl,
  skills: z.array(z.string().trim().min(1).max(100)).max(10),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>;
export type UpdateFreelancerProfileInput = z.infer<typeof updateFreelancerProfileSchema>;
