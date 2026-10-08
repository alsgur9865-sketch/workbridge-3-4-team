import { getPrisma } from '@/lib/prisma';
import type { UserRole } from '@/types/auth';

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

export async function selectUserRole(userId: string, role: UserRole) {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        role: null,
      },
      data: {
        role,
      },
    });

    if (updated.count === 0) {
      return null;
    }

    return tx.user.findUnique({
      where: { id: userId },
    });
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
