import { Router } from 'express';
import * as priceOfferController from '@/controllers/price-offer.controller';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';

export const priceOfferRouter = Router();

/**
 * @openapi
 * /applications/{applicationId}/price-offer:
 *   post:
 *     summary: Offer the final price to the selected applicant (project owner CLIENT)
 *     description: >
 *       Allowed while the project is in PRICE_AGREEMENT and the previous offer is
 *       NONE or REJECTED (re-offer). Sets priceOfferStatus to PENDING.
 *     tags: [Price agreement]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: applicationId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: integer, minimum: 1, example: 4500000 }
 *     responses:
 *       201:
 *         description: Offer created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Application' }
 *       400: { description: Invalid amount }
 *       401: { description: Not authenticated }
 *       403: { description: Not the project owner }
 *       404: { description: Application not found }
 *       409: { description: Not selected, offer pending, already agreed, or stage closed }
 *   patch:
 *     summary: Accept or reject the pending price offer (applicant FREELANCER)
 *     description: Accepting moves the project to CONTRACT_PENDING.
 *     tags: [Price agreement]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: applicationId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACCEPTED, REJECTED] }
 *     responses:
 *       200: { description: Updated application }
 *       401: { description: Not authenticated }
 *       403: { description: Not the applicant }
 *       404: { description: Application not found }
 *       409: { description: No pending offer }
 */
priceOfferRouter.post(
  '/applications/:applicationId/price-offer',
  requireAuth,
  requireRole('CLIENT'),
  priceOfferController.offerPrice,
);
priceOfferRouter.patch(
  '/applications/:applicationId/price-offer',
  requireAuth,
  requireRole('FREELANCER'),
  priceOfferController.respondToPriceOffer,
);
