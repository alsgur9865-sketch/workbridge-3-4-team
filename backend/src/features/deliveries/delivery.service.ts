import { AppError } from '@/errors/AppError';
import { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import type { AuthUser } from '@/types/auth';
import {
  attachmentTypes,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  type DeliveryInput,
} from './delivery.schemas';
import * as storage from './delivery.storage';

export type ReleaseContractPayment = (
  contractId: string,
  transaction: Prisma.TransactionClient,
) => Promise<unknown>;

const contractInclude = {
  project: {
    select: {
      id: true,
      title: true,
      clientId: true,
      transactionStatus: true,
      deletedAt: true,
      selectedApplicationId: true,
    },
  },
  application: { select: { freelancerId: true } },
  payment: { select: { status: true } },
  delivery: true,
} as const;

async function participantContract(
  user: AuthUser,
  contractId: string,
  database: Prisma.TransactionClient = getPrisma(),
) {
  const contract = await database.contract.findUnique({
    where: { id: contractId },
    include: contractInclude,
  });
  if (!contract || contract.project.deletedAt) {
    throw new AppError(404, 'CONTRACT_NOT_FOUND', 'The contract does not exist.');
  }
  if (user.id !== contract.project.clientId && user.id !== contract.application.freelancerId) {
    throw new AppError(
      403,
      'NOT_CONTRACT_PARTY',
      'Only the contract parties can access this delivery.',
    );
  }
  return contract;
}

type DeliveryContract = Awaited<ReturnType<typeof participantContract>>;

function assertInProgress(contract: DeliveryContract) {
  if (
    contract.status !== 'SIGNED' ||
    contract.project.transactionStatus !== 'IN_PROGRESS' ||
    contract.project.selectedApplicationId !== contract.applicationId ||
    contract.payment?.status !== 'ESCROWED'
  ) {
    throw new AppError(
      409,
      'DELIVERY_STAGE_CLOSED',
      'Delivery requires a signed, paid, in-progress contract.',
    );
  }
}

function assertCanSubmit(user: AuthUser, contract: DeliveryContract) {
  if (user.role !== 'FREELANCER' || user.id !== contract.application.freelancerId) {
    throw new AppError(
      403,
      'NOT_CONTRACT_FREELANCER',
      'Only the contracted freelancer can submit.',
    );
  }
  assertInProgress(contract);
  if (contract.delivery)
    throw new AppError(409, 'ALREADY_DELIVERED', 'A final delivery already exists.');
}

export async function getDelivery(user: AuthUser, contractId: string, settlementAvailable = false) {
  const contract = await participantContract(user, contractId);
  const inProgress =
    contract.status === 'SIGNED' &&
    contract.project.transactionStatus === 'IN_PROGRESS' &&
    contract.project.selectedApplicationId === contract.applicationId &&
    contract.payment?.status === 'ESCROWED';
  return {
    contractId,
    projectId: contract.projectId,
    projectTitle: contract.project.title,
    clientId: contract.project.clientId,
    freelancerId: contract.application.freelancerId,
    projectTransactionStatus: contract.project.transactionStatus,
    delivery: contract.delivery,
    canSubmit:
      inProgress &&
      !contract.delivery &&
      user.role === 'FREELANCER' &&
      user.id === contract.application.freelancerId,
    canApprove:
      inProgress &&
      contract.delivery?.status === 'SUBMITTED' &&
      user.role === 'CLIENT' &&
      user.id === contract.project.clientId &&
      settlementAvailable,
    settlementAvailable,
    storageConfigured: storage.isStorageConfigured(),
    uploadPolicy: {
      maxFiles: MAX_ATTACHMENTS,
      maxBytes: MAX_ATTACHMENT_BYTES,
      extensions: Object.keys(attachmentTypes),
    },
  };
}

export async function prepareUpload(user: AuthUser, contractId: string, filename: string) {
  const contract = await participantContract(user, contractId);
  assertCanSubmit(user, contract);
  return storage.createUpload(contractId, user.id, filename);
}

export async function submitDelivery(user: AuthUser, contractId: string, input: DeliveryInput) {
  const contract = await participantContract(user, contractId);
  assertCanSubmit(user, contract);
  await storage.verifyAttachments(input.attachmentUrls, contractId, user.id);
  try {
    return await getPrisma().$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT "id" FROM "Contract" WHERE "id" = ${contractId}::uuid FOR UPDATE`;
      const current = await participantContract(user, contractId, transaction);
      assertCanSubmit(user, current);
      const delivery = await transaction.delivery.create({
        data: {
          contractId,
          message: input.message,
          resultUrl: input.resultUrl ?? null,
          attachmentUrls: input.attachmentUrls,
          submittedAt: new Date(),
        },
      });
      await transaction.notification.create({
        data: {
          userId: current.project.clientId,
          type: 'DELIVERY_SUBMITTED',
          title: '결과물이 도착했습니다',
          message: `'${current.project.title}' 결과물을 확인해 주세요.`,
          targetUrl: `/contracts/${contractId}/delivery`,
        },
      });
      return delivery;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'ALREADY_DELIVERED', 'A final delivery already exists.');
    }
    throw error;
  }
}

export async function downloadAttachment(user: AuthUser, contractId: string, path: string) {
  const contract = await participantContract(user, contractId);
  storage.assertAttachmentPath(path, contractId, contract.application.freelancerId);
  const paths = contract.delivery?.attachmentUrls;
  if (!Array.isArray(paths) || !paths.includes(path)) {
    throw new AppError(
      404,
      'ATTACHMENT_NOT_FOUND',
      'The attachment is not part of the submitted delivery.',
    );
  }
  return storage.createDownload(path);
}

export async function approveDelivery(
  user: AuthUser,
  deliveryId: string,
  releasePayment?: ReleaseContractPayment,
) {
  const delivery = await getPrisma().delivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new AppError(404, 'DELIVERY_NOT_FOUND', 'The delivery does not exist.');
  const contract = await participantContract(user, delivery.contractId);
  if (user.role !== 'CLIENT' || user.id !== contract.project.clientId) {
    throw new AppError(403, 'NOT_PROJECT_OWNER', 'Only the contract client can approve.');
  }
  if (delivery.status === 'APPROVED')
    throw new AppError(409, 'ALREADY_APPROVED', 'Already approved.');
  assertInProgress(contract);
  if (!releasePayment) {
    throw new AppError(
      503,
      'SETTLEMENT_NOT_READY',
      'Approval will be available after settlement integration.',
    );
  }
  return getPrisma().$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "Contract" WHERE "id" = ${contract.id}::uuid FOR UPDATE`;
    const current = await participantContract(user, contract.id, transaction);
    assertInProgress(current);
    if (current.project.clientId !== user.id)
      throw new AppError(403, 'NOT_PROJECT_OWNER', 'Only the contract client can approve.');
    const approved = await transaction.delivery.updateMany({
      where: { id: deliveryId, status: 'SUBMITTED' },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });
    if (!approved.count) throw new AppError(409, 'ALREADY_APPROVED', 'Already approved.');
    const completed = await transaction.project.updateMany({
      where: { id: current.projectId, transactionStatus: 'IN_PROGRESS', deletedAt: null },
      data: { transactionStatus: 'COMPLETED' },
    });
    if (!completed.count)
      throw new AppError(409, 'DELIVERY_STAGE_CLOSED', 'The project is not in progress.');
    await releasePayment(current.id, transaction);
    const payment = await transaction.payment.findUnique({ where: { contractId: current.id } });
    if (
      payment?.status !== 'RELEASED' ||
      !payment.releasedAt ||
      payment.platformFee === null ||
      payment.settlementAmount === null
    ) {
      throw new AppError(
        503,
        'SETTLEMENT_NOT_READY',
        'Settlement did not complete in the approval transaction.',
      );
    }
    await transaction.notification.createMany({
      data: [current.project.clientId, current.application.freelancerId].flatMap((userId) => [
        {
          userId,
          type: 'PROJECT_COMPLETED' as const,
          title: '프로젝트가 완료되었습니다',
          message: `'${current.project.title}' 결과물이 승인되었습니다.`,
          targetUrl: `/contracts/${current.id}/delivery`,
        },
        {
          userId,
          type: 'REVIEW_REQUEST' as const,
          title: '함께한 경험을 남겨 주세요',
          message: '프로젝트가 완료되었습니다. 상대방에 대한 리뷰를 작성해 주세요.',
          targetUrl: `/contracts/${current.id}/review`,
        },
      ]),
    });
    return transaction.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
  });
}
