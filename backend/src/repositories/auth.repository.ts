import { getPrisma } from '@/lib/prisma';

interface CreateLocalUserInput {
  email: string;
  name: string;
  passwordHash: string;
}

export function findUserByEmail(email: string) {
  return getPrisma().user.findUnique({
    where: { email },
  });
}

export function createLocalUser(input: CreateLocalUserInput) {
  return getPrisma().user.create({
    data: input,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}
