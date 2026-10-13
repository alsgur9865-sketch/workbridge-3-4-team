import { z } from 'zod';

export const contractIdParamsSchema = z.object({
  contractId: z.string().uuid(),
});

export const createContractSchema = z.object({
  applicationId: z.string().uuid(),
  contractStartAt: z.coerce.date().optional(),
  contractEndAt: z.coerce.date().optional(),
  terms: z.string().trim().min(10).max(5000),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;

export interface ContractContent {
  projectTitle: string;
  clientName: string;
  freelancerName: string;
  terms: string;
}
