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

export function findUserByGoogleId(oauthProviderId: string) {
  return getPrisma().user.findUnique({
    where: {
      oauthProvider_oauthProviderId: {
        oauthProvider: 'GOOGLE',
        oauthProviderId,
      },
    },
  });
}

export function createGoogleUser(input: {
  email: string;
  name: string;
  oauthProviderId: string;
  profileImageUrl?: string | null;
}) {
  return getPrisma().user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: null,
      oauthProvider: 'GOOGLE',
      oauthProviderId: input.oauthProviderId,
      profileImageUrl: input.profileImageUrl ?? null,
    },
  });
}

export function linkGoogleAccount(
  userId: string,
  input: {
    oauthProviderId: string;
    profileImageUrl?: string | null;
  },
) {
  return getPrisma().user.update({
    where: { id: userId },
    data: {
      oauthProvider: 'GOOGLE',
      oauthProviderId: input.oauthProviderId,
      profileImageUrl: input.profileImageUrl ?? undefined,
    },
  });
}