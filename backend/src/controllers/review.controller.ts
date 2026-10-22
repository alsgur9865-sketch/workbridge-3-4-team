import type { RequestHandler } from 'express';
import { getAuthUser } from '@/middlewares/auth.middleware';
import { contractIdParamsSchema } from '@/schemas/contract.schema';
import { createReviewSchema, userIdParamsSchema } from '@/schemas/review.schema';
import * as reviewService from '@/services/review.service';

export const createReview: RequestHandler = async (request, response) => {
  const { contractId } = contractIdParamsSchema.parse(request.params);
  const input = createReviewSchema.parse(request.body);

  const review = await reviewService.createReview(getAuthUser(request), contractId, input);
  response.status(201).json({ success: true, data: review });
};

export const getContractReviews: RequestHandler = async (request, response) => {
  const { contractId } = contractIdParamsSchema.parse(request.params);

  const reviews = await reviewService.getContractReviews(getAuthUser(request), contractId);
  response.json({ success: true, data: reviews });
};

export const getUserReviews: RequestHandler = async (request, response) => {
  const { userId } = userIdParamsSchema.parse(request.params);

  const reviews = await reviewService.getUserReviews(userId);
  response.json({ success: true, data: reviews });
};

export const getReviewHighlights: RequestHandler = async (_request, response) => {
  const highlights = await reviewService.getReviewHighlights();
  response.json({ success: true, data: highlights });
};
