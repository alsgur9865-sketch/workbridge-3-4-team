export type ContractStatus = 'DRAFT' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'CANCELLED';

export interface Contract {
  id: string;
  projectId: string;
  applicationId: string;
  clientId: string;
  freelancerId: string;
  projectTitle: string;
  agreedAmount: number;
  contractStartAt: string;
  contractEndAt: string;
  content: {
    projectTitle: string;
    clientName: string;
    freelancerName: string;
    terms: string;
  } | null;
  status: ContractStatus;
  clientSignedAt: string | null;
  freelancerSignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  projectTransactionStatus?: string;
}

export interface CreateContractInput {
  applicationId: string;
  contractStartAt: string;
  contractEndAt: string;
  terms: string;
}
