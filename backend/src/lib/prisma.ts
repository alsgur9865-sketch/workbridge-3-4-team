import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@/config/env';
import { PrismaClient } from '@/generated/prisma/client';

let prismaInstance: PrismaClient | null = null;

export function getPrisma() {
  if (prismaInstance) {
    return prismaInstance;
  }

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  prismaInstance = new PrismaClient({ adapter });
  return prismaInstance;
}

export async function disconnectPrisma() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
