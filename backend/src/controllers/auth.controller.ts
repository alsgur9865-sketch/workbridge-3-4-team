import type { RequestHandler } from 'express';
import { signupSchema } from '@/schemas/auth.schema';
import { signup } from '@/services/auth.service';

export const signupController: RequestHandler = async (request, response) => {
  const input = signupSchema.parse(request.body);
  const user = await signup(input);

  response.status(201).json({
    success: true,
    data: {
      user,
    },
  });
};
