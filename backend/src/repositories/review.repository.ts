import { AppError } from '@/errors/AppError';
import { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import type { CreateReviewInput } from '@/schemas/review.schema';

const reviewerSelect = { id: true, name: true, role: true } as const;

export function findContractForReview(contractId: string) {
  return getPrisma().contract.findUnique({
    where: { id: contractId },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          clientId: true,
          transactionStatus: true,
          deletedAt: true,
          client: { select: { id: true, name: true } },
        },
      },
      application: {
        select: { freelancerId: true, freelancer: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function createReview(params: {
  contractId: string;
  reviewerId: string;
  revieweeId: string;
  input: CreateReviewInput;
}) {
  const { contractId, reviewerId, revieweeId, input } = params;

  try {
    return await getPrisma().review.create({
      data: {
        contractId,
        reviewerId,
        revieweeId,
        rating: input.rating,
        content: input.content,
        tags: input.tags,
      },
      include: { reviewer: { select: reviewerSelect } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'ALREADY_REVIEWED', 'You have already reviewed this contract.');
    }
    throw error;
  }
}

export function listContractReviews(contractId: string) {
  return getPrisma().review.findMany({
    where: { contractId },
    include: { reviewer: { select: reviewerSelect } },
    orderBy: { createdAt: 'asc' },
  });
}

export function findUserForReviews(userId: string) {
  return getPrisma().user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });
}

export async function listUserReviews(userId: string, take: number) {
  const prisma = getPrisma();
  const [summary, reviews] = await Promise.all([
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.findMany({
      where: { revieweeId: userId },
      include: {
        reviewer: { select: reviewerSelect },
        contract: { select: { project: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    }),
  ]);

  return {
    averageRating: summary._avg.rating,
    reviewCount: summary._count._all,
    reviews,
  };
}

export async function getPublicReviewHighlights(take: number) {
  const prisma = getPrisma();
  const completedReviewWhere = {
    contract: {
      project: {
        transactionStatus: 'COMPLETED' as const,
        deletedAt: null,
      },
    },
  };

  const [summary, demoReviewCount, completedProjectCount, reviews] = await Promise.all([
    prisma.review.aggregate({
      where: completedReviewWhere,
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.count({
      where: {
        ...completedReviewWhere,
        OR: [
          { reviewer: { email: { endsWith: '@workbridge.test' } } },
          { contract: { project: { title: { startsWith: '[테스트]' } } } },
        ],
      },
    }),
    prisma.project.count({
      where: { transactionStatus: 'COMPLETED', deletedAt: null },
    }),
    prisma.review.findMany({
      where: completedReviewWhere,
      select: {
        id: true,
        rating: true,
        content: true,
        tags: true,
        createdAt: true,
        reviewer: { select: { role: true, email: true } },
        contract: { select: { project: { select: { id: true, title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    }),
  ]);

  return {
    averageRating: summary._avg.rating,
    reviewCount: summary._count._all,
    demoReviewCount,
    completedProjectCount,
    reviews,
  };
}
