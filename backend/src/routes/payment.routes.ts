import { Router } from 'express';
import * as paymentController from '@/controllers/payment.controller';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';

export const paymentRouter = Router();

/**
 * @openapi
 * /contracts/{contractId}/payment:
 *   post:
 *     summary: Prepare a Toss payment for a signed contract
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: contractId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Existing READY payment }
 *       201: { description: Payment order prepared }
 *       401: { description: Not authenticated }
 *       403: { description: Not the project owner }
 *       404: { description: Contract not found }
 *       409: { description: Contract not signed, wrong project stage, or payment already processed }
 */
paymentRouter.post(
  '/contracts/:contractId/payment',
  requireAuth,
  requireRole('CLIENT'),
  paymentController.preparePayment,
);

/**
 * @openapi
 * /payments/confirm:
 *   post:
 *     summary: Confirm an authenticated Toss payment
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Payment confirmed and escrowed }
 *       400: { description: Invalid or mismatched payment data }
 *       401: { description: Not authenticated }
 *       403: { description: Not the project owner }
 *       404: { description: Payment not found }
 *       409: { description: Payment or project is no longer confirmable }
 *       502: { description: Toss Payments rejected the request or is unavailable }
 *       503: { description: Toss Payments server key is not configured }
 */
paymentRouter.post(
  '/payments/confirm',
  requireAuth,
  requireRole('CLIENT'),
  paymentController.confirmPayment,
);

/**
 * @openapi
 * /payments/{paymentId}:
 *   get:
 *     summary: Get payment detail for a contract party
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 */
paymentRouter.get('/payments/:paymentId', requireAuth, paymentController.getPayment);
