import { AppError } from '@/errors/AppError';
import * as contractRepository from '@/repositories/contract.repository';
import type { ContractContent, CreateContractInput } from '@/schemas/contract.schema';
import type { AuthUser } from '@/types/auth';

type ContractRecord = Awaited<ReturnType<typeof contractRepository.createContract>>;

function toContractDto(
  contract: ContractRecord,
  parties: { clientId: string; freelancerId: string; projectTitle: string },
) {
  return {
    id: contract.id,
    projectId: contract.projectId,
    applicationId: contract.applicationId,
    clientId: parties.clientId,
    freelancerId: parties.freelancerId,
    projectTitle: parties.projectTitle,
    agreedAmount: Number(contract.agreedAmount),
    contractStartAt: contract.contractStartAt,
    contractEndAt: contract.contractEndAt,
    content: contract.contractContent as ContractContent | null,
    status: contract.status,
    clientSignedAt: contract.clientSignedAt,
    freelancerSignedAt: contract.freelancerSignedAt,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}

export async function createContract(user: AuthUser, input: CreateContractInput) {
  const application = await contractRepository.findApplicationForContract(input.applicationId);
  if (!application || application.project.deletedAt) {
    throw new AppError(404, 'APPLICATION_NOT_FOUND', 'The application does not exist.');
  }

  const { project } = application;
  if (project.clientId !== user.id) {
    throw new AppError(403, 'NOT_PROJECT_OWNER', 'Only the project owner can create a contract.');
  }

  if (application.contract) {
    throw new AppError(409, 'CONTRACT_ALREADY_EXISTS', 'A contract already exists.');
  }

  if (
    project.selectedApplicationId !== application.id ||
    application.priceOfferStatus !== 'ACCEPTED' ||
    application.clientOfferAmount === null
  ) {
    throw new AppError(
      409,
      'PRICE_NOT_AGREED',
      'A contract can only be created after the price is agreed.',
    );
  }

  if (project.transactionStatus !== 'CONTRACT_PENDING') {
    throw new AppError(409, 'CONTRACT_STAGE_CLOSED', 'The project is not waiting for a contract.');
  }

  const contractStartAt = input.contractStartAt ?? project.workStartAt;
  const contractEndAt = input.contractEndAt ?? project.workEndAt;
  if (contractEndAt.getTime() <= contractStartAt.getTime()) {
    throw new AppError(
      400,
      'INVALID_CONTRACT_PERIOD',
      'The contract end date must be after the start date.',
    );
  }

  const contract = await contractRepository.createContract({
    projectId: project.id,
    applicationId: application.id,
    freelancerId: application.freelancerId,
    agreedAmount: application.clientOfferAmount,
    contractStartAt,
    contractEndAt,
    content: {
      projectTitle: project.title,
      clientName: project.client.name ?? project.client.email,
      freelancerName: application.freelancer.name ?? application.freelancer.email,
      terms: input.terms,
    },
  });

  return toContractDto(contract, {
    clientId: project.clientId,
    freelancerId: application.freelancerId,
    projectTitle: project.title,
  });
}

async function getParticipantContract(user: AuthUser, contractId: string) {
  const contract = await contractRepository.findContractDetail(contractId);
  if (!contract || contract.project.deletedAt) {
    throw new AppError(404, 'CONTRACT_NOT_FOUND', 'The contract does not exist.');
  }

  const clientId = contract.project.clientId;
  const freelancerId = contract.application.freelancerId;
  if (user.id !== clientId && user.id !== freelancerId) {
    throw new AppError(
      403,
      'NOT_CONTRACT_PARTY',
      'Only the client and the freelancer can access this contract.',
    );
  }

  return { contract, clientId, freelancerId };
}

export async function getContract(user: AuthUser, contractId: string) {
  const { contract, clientId, freelancerId } = await getParticipantContract(user, contractId);
  return {
    ...toContractDto(contract, {
      clientId,
      freelancerId,
      projectTitle: contract.project.title,
    }),
    projectTransactionStatus: contract.project.transactionStatus,
  };
}

export async function signContract(user: AuthUser, contractId: string) {
  const { contract, clientId, freelancerId } = await getParticipantContract(user, contractId);

  const signed = await contractRepository.signContract({
    contractId,
    party: user.id === clientId ? 'CLIENT' : 'FREELANCER',
    projectId: contract.projectId,
    projectTitle: contract.project.title,
    clientId,
    freelancerId,
  });

  return {
    ...toContractDto(signed, { clientId, freelancerId, projectTitle: contract.project.title }),
    projectTransactionStatus:
      signed.status === 'SIGNED' && contract.project.transactionStatus === 'CONTRACT_PENDING'
        ? 'PAYMENT_PENDING'
        : contract.project.transactionStatus,
  };
}
