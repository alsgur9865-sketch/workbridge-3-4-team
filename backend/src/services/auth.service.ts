import { AppError } from '@/errors/AppError';
import { createLocalUser, findUserByEmail } from '@/repositories/auth.repository';
import type { SignupInput } from '@/schemas/auth.schema';
import { hashPassword } from '@/utils/password';

export async function signup(input: SignupInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'This email is already registered.');
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await createLocalUser({
      email,
      name,
      passwordHash,
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new AppError(409, 'EMAIL_ALREADY_IN_USE', 'This email is already registered.');
    }

    throw error;
  }
}
