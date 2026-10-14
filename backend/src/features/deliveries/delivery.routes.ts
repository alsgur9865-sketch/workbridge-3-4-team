import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getAuthUser, requireAuth, requireRole } from '@/middlewares/auth.middleware';
import {
  contractParams,
  deliveryParams,
  deliveryInput,
  uploadInput,
  pathSchema,
} from './delivery.schemas';
import * as service from './delivery.service';

export function createDeliveryRouter(releasePayment?: service.ReleaseContractPayment) {
  const router = Router();
  const uploadLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  router.get('/contracts/:contractId/delivery', requireAuth, async (request, response) => {
    const { contractId } = contractParams.parse(request.params);
    response.set('Cache-Control', 'no-store').json({
      success: true,
      data: await service.getDelivery(getAuthUser(request), contractId, Boolean(releasePayment)),
    });
  });
  router.post(
    '/contracts/:contractId/delivery',
    requireAuth,
    requireRole('FREELANCER'),
    async (request, response) => {
      const { contractId } = contractParams.parse(request.params);
      const data = await service.submitDelivery(
        getAuthUser(request),
        contractId,
        deliveryInput.parse(request.body),
      );
      response.status(201).json({ success: true, data });
    },
  );
  router.post(
    '/contracts/:contractId/delivery/upload-url',
    requireAuth,
    requireRole('FREELANCER'),
    uploadLimit,
    async (request, response) => {
      const { contractId } = contractParams.parse(request.params);
      const input = uploadInput.parse(request.body);
      const data = await service.prepareUpload(getAuthUser(request), contractId, input.filename);
      response.set('Cache-Control', 'no-store').json({ success: true, data });
    },
  );
  router.post(
    '/contracts/:contractId/delivery/download-url',
    requireAuth,
    async (request, response) => {
      const { contractId } = contractParams.parse(request.params);
      const { path } = z.object({ path: pathSchema }).strict().parse(request.body);
      const data = await service.downloadAttachment(getAuthUser(request), contractId, path);
      response.set('Cache-Control', 'no-store').json({ success: true, data });
    },
  );
  router.patch(
    '/deliveries/:deliveryId/approve',
    requireAuth,
    requireRole('CLIENT'),
    async (request, response) => {
      const { deliveryId } = deliveryParams.parse(request.params);
      const data = await service.approveDelivery(getAuthUser(request), deliveryId, releasePayment);
      response.json({ success: true, data });
    },
  );
  return router;
}
