import type { RequestHandler } from 'express';
import { getAuthUser } from '@/middlewares/auth.middleware';
import { contractIdParamsSchema } from '@/schemas/contract.schema';
import { confirmPaymentSchema, paymentIdParamsSchema } from '@/schemas/payment.schema';
import * as paymentService from '@/services/payment.service';

export const preparePayment: RequestHandler = async (request, response) => {
  const { contractId } = contractIdParamsSchema.parse(request.params);
  const result = await paymentService.preparePayment(getAuthUser(request), contractId);

  response.status(result.created ? 201 : 200).json({ success: true, data: result.data });
};

export const confirmPayment: RequestHandler = async (request, response) => {
  const input = confirmPaymentSchema.parse(request.body);
  const payment = await paymentService.confirmPayment(getAuthUser(request), input);

  response.json({ success: true, data: payment });
};

export const getPayment: RequestHandler = async (request, response) => {
  const { paymentId } = paymentIdParamsSchema.parse(request.params);
  const payment = await paymentService.getPayment(getAuthUser(request), paymentId);

  response.json({ success: true, data: payment });
};
