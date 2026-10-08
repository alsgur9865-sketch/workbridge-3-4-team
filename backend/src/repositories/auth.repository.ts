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

export function findUserById(id: string) {
  return getPrisma().user.findUnique({
    where: { id },
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

export function updateRefreshTokenHash(userId: string, refreshTokenHash: string) {
  return getPrisma().user.update({
    where: { id: userId },
    data: { refreshTokenHash },
  });
}

export function clearRefreshTokenHash(userId: string) {
  return getPrisma().user.updateMany({
    where: { id: userId },
    data: { refreshTokenHash: null },
  });
}
