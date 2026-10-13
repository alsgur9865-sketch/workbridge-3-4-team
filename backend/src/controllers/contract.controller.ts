import type { RequestHandler } from 'express';
import { getAuthUser } from '@/middlewares/auth.middleware';
import { contractIdParamsSchema, createContractSchema } from '@/schemas/contract.schema';
import * as contractService from '@/services/contract.service';

export const createContract: RequestHandler = async (request, response) => {
  const input = createContractSchema.parse(request.body);

  const contract = await contractService.createContract(getAuthUser(request), input);
  response.status(201).json({ success: true, data: contract });
};

export const getContract: RequestHandler = async (request, response) => {
  const { contractId } = contractIdParamsSchema.parse(request.params);

  const contract = await contractService.getContract(getAuthUser(request), contractId);
  response.json({ success: true, data: contract });
};

export const signContract: RequestHandler = async (request, response) => {
  const { contractId } = contractIdParamsSchema.parse(request.params);

  const contract = await contractService.signContract(getAuthUser(request), contractId);
  response.json({ success: true, data: contract });
};
