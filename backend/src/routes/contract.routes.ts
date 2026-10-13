import { Router } from 'express';
import * as contractController from '@/controllers/contract.controller';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';

export const contractRouter = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Contract:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         projectId: { type: string, format: uuid }
 *         applicationId: { type: string, format: uuid }
 *         clientId: { type: string, format: uuid }
 *         freelancerId: { type: string, format: uuid }
 *         projectTitle: { type: string }
 *         agreedAmount: { type: number, example: 4500000 }
 *         contractStartAt: { type: string, format: date-time }
 *         contractEndAt: { type: string, format: date-time }
 *         content:
 *           type: object
 *           properties:
 *             projectTitle: { type: string }
 *             clientName: { type: string }
 *             freelancerName: { type: string }
 *             terms: { type: string }
 *         status: { type: string, enum: [DRAFT, PARTIALLY_SIGNED, SIGNED, CANCELLED] }
 *         clientSignedAt: { type: string, format: date-time, nullable: true }
 *         freelancerSignedAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /contracts:
 *   post:
 *     summary: Create a contract after the price is agreed (project owner CLIENT)
 *     description: >
 *       The agreed amount is taken from the accepted price offer. Contract dates default
 *       to the project work period.
 *     tags: [Contracts]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [applicationId, terms]
 *             properties:
 *               applicationId: { type: string, format: uuid }
 *               contractStartAt: { type: string, format: date-time }
 *               contractEndAt: { type: string, format: date-time }
 *               terms: { type: string, minLength: 10, maxLength: 5000 }
 *     responses:
 *       201:
 *         description: Contract created as DRAFT
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Contract' }
 *       400: { description: Invalid body or contract period }
 *       401: { description: Not authenticated }
 *       403: { description: Not the project owner }
 *       404: { description: Application not found }
 *       409: { description: Price not agreed, wrong stage, or contract already exists }
 */
contractRouter.post('/', requireAuth, requireRole('CLIENT'), contractController.createContract);

/**
 * @openapi
 * /contracts/{contractId}:
 *   get:
 *     summary: Get a contract (client or freelancer of the contract)
 *     tags: [Contracts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: contractId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Contract detail }
 *       401: { description: Not authenticated }
 *       403: { description: Not a party to the contract }
 *       404: { description: Contract not found }
 */
contractRouter.get('/:contractId', requireAuth, contractController.getContract);

/**
 * @openapi
 * /contracts/{contractId}/sign:
 *   post:
 *     summary: Sign the contract as the current party
 *     description: >
 *       One signature moves the contract to PARTIALLY_SIGNED. When both parties have signed
 *       it becomes SIGNED and the project moves to PAYMENT_PENDING.
 *     tags: [Contracts]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: contractId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Updated contract }
 *       401: { description: Not authenticated }
 *       403: { description: Not a party to the contract }
 *       404: { description: Contract not found }
 *       409: { description: Already signed or contract not signable }
 */
contractRouter.post('/:contractId/sign', requireAuth, contractController.signContract);
