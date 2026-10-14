import { Router } from 'express';
import * as applicationController from '@/controllers/application.controller';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';

export const applicationRouter = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Application:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         projectId: { type: string, format: uuid }
 *         freelancerId: { type: string, format: uuid }
 *         introduction: { type: string }
 *         proposedAmount: { type: number, example: 3000000 }
 *         estimatedDays: { type: integer, example: 30 }
 *         status: { type: string, enum: [PENDING, ACCEPTED, REJECTED] }
 *         clientOfferAmount: { type: number, nullable: true }
 *         priceOfferStatus: { type: string, enum: [NONE, PENDING, ACCEPTED, REJECTED] }
 *         offeredAt: { type: string, format: date-time, nullable: true }
 *         respondedAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     CreateApplicationRequest:
 *       type: object
 *       required: [introduction, proposedAmount, estimatedDays]
 *       properties:
 *         introduction: { type: string, minLength: 10, maxLength: 2000 }
 *         proposedAmount: { type: integer, minimum: 1, example: 3000000 }
 *         estimatedDays: { type: integer, minimum: 1, maximum: 365, example: 30 }
 */

/**
 * @openapi
 * /projects/{projectId}/applications:
 *   post:
 *     summary: Apply to a project (FREELANCER)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateApplicationRequest' }
 *     responses:
 *       201:
 *         description: Application created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Application' }
 *       400: { description: Invalid request body }
 *       401: { description: Not authenticated }
 *       403: { description: Not a freelancer, or applying to own project }
 *       404: { description: Project not found }
 *       409: { description: Recruitment closed or already applied }
 *   get:
 *     summary: List applications for a project (project owner CLIENT)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: projectId, required: true, schema: { type: string, format: uuid } }
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, ACCEPTED, REJECTED] } }
 *     responses:
 *       200: { description: Applications with freelancer summaries }
 *       401: { description: Not authenticated }
 *       403: { description: Not the project owner }
 *       404: { description: Project not found }
 */
applicationRouter.post(
  '/projects/:projectId/applications',
  requireAuth,
  requireRole('FREELANCER'),
  applicationController.applyToProject,
);
applicationRouter.get(
  '/projects/:projectId/applications',
  requireAuth,
  requireRole('CLIENT'),
  applicationController.listProjectApplications,
);

/**
 * @openapi
 * /applications/me:
 *   get:
 *     summary: List my applications (FREELANCER)
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, ACCEPTED, REJECTED] } }
 *     responses:
 *       200: { description: Applications with project summaries }
 *       401: { description: Not authenticated }
 *       403: { description: Not a freelancer }
 */
applicationRouter.get(
  '/applications/me',
  requireAuth,
  requireRole('FREELANCER'),
  applicationController.listMyApplications,
);

/**
 * @openapi
 * /applications/{applicationId}:
 *   get:
 *     summary: Get one application with project and freelancer summaries
 *     description: Visible to the project owner and the applicant only.
 *     tags: [Applications]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: applicationId, required: true, schema: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Application detail }
 *       401: { description: Not authenticated }
 *       403: { description: Neither the project owner nor the applicant }
 *       404: { description: Application not found }
 */
applicationRouter.get(
  '/applications/:applicationId',
  requireAuth,
  applicationController.getApplication,
);

/**
 * @openapi
 * /applications/{applicationId}/status:
 *   patch:
 *     summary: Accept or reject an application (project owner CLIENT)
 *     description: >
 *       Accepting closes recruitment, moves the project to PRICE_AGREEMENT,
 *       and auto-rejects every other pending application.
 *     tags: [Applications]
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
 *       403: { description: Not the project owner }
 *       404: { description: Application not found }
 *       409: { description: Already processed or an applicant was already selected }
 */
applicationRouter.patch(
  '/applications/:applicationId/status',
  requireAuth,
  requireRole('CLIENT'),
  applicationController.decideApplication,
);
