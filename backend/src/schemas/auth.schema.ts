import { z } from 'zod';
import { USER_ROLES } from '@/types/auth';

export const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

export const selectRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SelectRoleInput = z.infer<typeof selectRoleSchema>;
