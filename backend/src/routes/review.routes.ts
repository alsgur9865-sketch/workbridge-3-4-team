import { Router } from 'express';
import * as reviewController from '@/controllers/review.controller';
import { requireAuth } from '@/middlewares/auth.middleware';

export const reviewRouter = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         contractId: { type: string, format: uuid }
 *         reviewerId: { type: string, format: uuid }
 *         revieweeId: { type: string, format: uuid }
 *         rating: { type: integer, minimum: 1, maximum: 5 }
 *         content: { type: string }
 *         tags: { type: array, items: { type: string } }
 *         reviewer:
 *           type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             name: { type: string, nullable: true }
 *             role: { type: string, enum: [CLIENT, FREELANCER], nullable: true }
 *         createdAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /contracts/{contractId}/reviews:
 *   post:
 *     summary: Review the other party of a completed contract
 *     description: >
 *       Only the client or freelancer of the contract can write a review, only after the
 *       project is COMPLETED, and only once per direction. The reviewee is always the
 *       other party.
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: contractId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, content]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5, example: 5 }
 *               content: { type: string, minLength: 10, maxLength: 1000 }
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [빠른 소통, 요구사항 명확, 일정 준수, 높은 완성도, 재협업 희망, 친절한 응대, 꼼꼼한 피드백]
 *     responses:
 *       201:
 *         description: Review created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Review' }
 *       400: { description: Invalid rating, content, or tags }
 *       401: { description: Not authenticated }
 *       403: { description: Not a party to the contract }
 *       404: { description: Contract not found }
 *       409: { description: Project not completed or already reviewed }
 *   get:
 *     summary: Reviews of a contract plus whether the current user can still write one
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: contractId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Contract reviews }
 *       401: { description: Not authenticated }
 *       403: { description: Not a party to the contract }
 *       404: { description: Contract not found }
 */
reviewRouter.post('/contracts/:contractId/reviews', requireAuth, reviewController.createReview);
reviewRouter.get(
  '/contracts/:contractId/reviews',
  requireAuth,
  reviewController.getContractReviews,
);

/**
 * @openapi
 * /users/{userId}/reviews:
 *   get:
 *     summary: Rating summary and recent reviews a user has received
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: userId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Average rating, review count, and the 10 most recent reviews }
 *       401: { description: Not authenticated }
 *       404: { description: User not found }
 */
reviewRouter.get('/users/:userId/reviews', requireAuth, reviewController.getUserReviews);
