import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(1).max(100),
});

export type SignupInput = z.infer<typeof signupSchema>;
