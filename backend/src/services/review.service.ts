import { AppError } from '@/errors/AppError';
import * as reviewRepository from '@/repositories/review.repository';
import type { CreateReviewInput } from '@/schemas/review.schema';
import type { AuthUser } from '@/types/auth';

const RECENT_REVIEW_LIMIT = 10;
const PUBLIC_REVIEW_LIMIT = 3;
const DEMO_EMAIL_SUFFIX = '@workbridge.test';
const TEST_PROJECT_PREFIX = '[테스트]';

type ReviewRecord = Awaited<ReturnType<typeof reviewRepository.createReview>>;

function toReviewDto(review: ReviewRecord) {
  return {
    id: review.id,
    contractId: review.contractId,
    reviewerId: review.reviewerId,
    revieweeId: review.revieweeId,
    rating: review.rating,
    content: review.content,
    tags: Array.isArray(review.tags) ? (review.tags as string[]) : [],
    reviewer: review.reviewer,
    createdAt: review.createdAt,
  };
}

async function getParticipantContract(user: AuthUser, contractId: string) {
  const contract = await reviewRepository.findContractForReview(contractId);
  if (!contract || contract.project.deletedAt) {
    throw new AppError(404, 'CONTRACT_NOT_FOUND', 'The contract does not exist.');
  }

  const client = contract.project.client;
  const freelancer = contract.application.freelancer;
  if (user.id !== client.id && user.id !== freelancer.id) {
    throw new AppError(
      403,
      'NOT_CONTRACT_PARTY',
      'Only the client and the freelancer of this contract can access its reviews.',
    );
  }

  const counterpart = user.id === client.id ? freelancer : client;
  return { contract, counterpart };
}

export async function createReview(user: AuthUser, contractId: string, input: CreateReviewInput) {
  const { contract, counterpart } = await getParticipantContract(user, contractId);

  if (contract.project.transactionStatus !== 'COMPLETED') {
    throw new AppError(
      409,
      'PROJECT_NOT_COMPLETED',
      'Reviews can only be written after the project is completed.',
    );
  }

  if (counterpart.id === user.id) {
    throw new AppError(400, 'CANNOT_REVIEW_SELF', 'You cannot review yourself.');
  }

  const review = await reviewRepository.createReview({
    contractId,
    reviewerId: user.id,
    revieweeId: counterpart.id,
    input,
  });
  return toReviewDto(review);
}

export async function getContractReviews(user: AuthUser, contractId: string) {
  const { contract, counterpart } = await getParticipantContract(user, contractId);
  const reviews = (await reviewRepository.listContractReviews(contractId)).map(toReviewDto);
  const isCompleted = contract.project.transactionStatus === 'COMPLETED';
  const myReview = reviews.find((review) => review.reviewerId === user.id) ?? null;

  return {
    contractId,
    projectTitle: contract.project.title,
    isProjectCompleted: isCompleted,
    counterpart,
    canWrite: isCompleted && !myReview,
    myReview,
    reviews,
  };
}

export async function getUserReviews(userId: string) {
  const user = await reviewRepository.findUserForReviews(userId);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'The user does not exist.');
  }

  const { averageRating, reviewCount, reviews } = await reviewRepository.listUserReviews(
    userId,
    RECENT_REVIEW_LIMIT,
  );

  return {
    user,
    averageRating: averageRating === null ? null : Math.round(averageRating * 10) / 10,
    reviewCount,
    reviews: reviews.map((review) => ({
      ...toReviewDto(review),
      project: review.contract.project,
    })),
  };
}

export async function getReviewHighlights() {
  const result = await reviewRepository.getPublicReviewHighlights(PUBLIC_REVIEW_LIMIT);

  return {
    averageRating:
      result.averageRating === null ? null : Math.round(result.averageRating * 10) / 10,
    reviewCount: result.reviewCount,
    completedProjectCount: result.completedProjectCount,
    includesDemoData: result.demoReviewCount > 0,
    hasOnlyDemoReviews: result.reviewCount > 0 && result.demoReviewCount === result.reviewCount,
    reviews: result.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      content: review.content,
      tags: Array.isArray(review.tags) ? (review.tags as string[]) : [],
      reviewerRole: review.reviewer.role,
      project: review.contract.project,
      createdAt: review.createdAt,
      isDemo:
        review.reviewer.email.endsWith(DEMO_EMAIL_SUFFIX) ||
        review.contract.project.title.startsWith(TEST_PROJECT_PREFIX),
    })),
  };
}
