import type { RequestHandler } from 'express';
import { getAuthUser } from '@/middlewares/auth.middleware';
import { applicationIdParamsSchema } from '@/schemas/application.schema';
import { createPriceOfferSchema, respondPriceOfferSchema } from '@/schemas/price-offer.schema';
import * as priceOfferService from '@/services/price-offer.service';

export const offerPrice: RequestHandler = async (request, response) => {
  const { applicationId } = applicationIdParamsSchema.parse(request.params);
  const { amount } = createPriceOfferSchema.parse(request.body);

  const application = await priceOfferService.offerPrice(
    getAuthUser(request),
    applicationId,
    amount,
  );
  response.status(201).json({ success: true, data: application });
};

export const respondToPriceOffer: RequestHandler = async (request, response) => {
  const { applicationId } = applicationIdParamsSchema.parse(request.params);
  const { status } = respondPriceOfferSchema.parse(request.body);

  const application = await priceOfferService.respondToPriceOffer(
    getAuthUser(request),
    applicationId,
    status,
  );
  response.json({ success: true, data: application });
};
