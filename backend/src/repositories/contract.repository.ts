import { AppError } from '@/errors/AppError';
import { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import type { ContractContent } from '@/schemas/contract.schema';

const partySelect = { id: true, name: true, email: true } as const;

export function findApplicationForContract(applicationId: string) {
  return getPrisma().application.findUnique({
    where: { id: applicationId },
    include: {
      freelancer: { select: partySelect },
      contract: { select: { id: true } },
      project: {
        select: {
          id: true,
          clientId: true,
          title: true,
          transactionStatus: true,
          selectedApplicationId: true,
          workStartAt: true,
          workEndAt: true,
          deletedAt: true,
          client: { select: partySelect },
        },
      },
    },
  });
}

export async function createContract(params: {
  projectId: string;
  applicationId: string;
  freelancerId: string;
  agreedAmount: Prisma.Decimal;
  contractStartAt: Date;
  contractEndAt: Date;
  content: ContractContent;
}) {
  const { projectId, applicationId, freelancerId, content, ...data } = params;

  try {
    return await getPrisma().$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          projectId,
          applicationId,
          contractContent: { ...content },
          ...data,
        },
      });

      await tx.notification.create({
        data: {
          userId: freelancerId,
          type: 'CONTRACT_SIGN_REQUEST',
          title: '계약서 서명 요청',
          message: `'${content.projectTitle}' 프로젝트의 계약서가 작성되었습니다. 내용을 확인하고 서명해 주세요.`,
          targetUrl: `/contracts/${contract.id}`,
        },
      });

      return contract;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'CONTRACT_ALREADY_EXISTS', 'A contract already exists.');
    }
    throw error;
  }
}

export function findContractDetail(contractId: string) {
  return getPrisma().contract.findUnique({
    where: { id: contractId },
    include: {
      project: {
        select: { id: true, title: true, clientId: true, transactionStatus: true, deletedAt: true },
      },
      application: { select: { id: true, freelancerId: true } },
    },
  });
}

/**
 * Records one party's signature. The contract row is locked first so two parties
 * signing at the same moment still end up with a SIGNED contract.
 */
export async function signContract(params: {
  contractId: string;
  party: 'CLIENT' | 'FREELANCER';
  projectId: string;
  projectTitle: string;
  clientId: string;
  freelancerId: string;
}) {
  const { contractId, party, projectId, projectTitle, clientId, freelancerId } = params;

  return getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Contract" WHERE "id" = ${contractId}::uuid FOR UPDATE`;

    const current = await tx.contract.findUniqueOrThrow({ where: { id: contractId } });
    if (current.status === 'CANCELLED' || current.status === 'SIGNED') {
      throw new AppError(409, 'CONTRACT_NOT_SIGNABLE', 'This contract can no longer be signed.');
    }

    const signedAtField = party === 'CLIENT' ? 'clientSignedAt' : 'freelancerSignedAt';
    if (current[signedAtField]) {
      throw new AppError(409, 'ALREADY_SIGNED', 'You have already signed this contract.');
    }

    const now = new Date();
    const clientSignedAt = party === 'CLIENT' ? now : current.clientSignedAt;
    const freelancerSignedAt = party === 'FREELANCER' ? now : current.freelancerSignedAt;
    const fullySigned = Boolean(clientSignedAt && freelancerSignedAt);

    const contract = await tx.contract.update({
      where: { id: contractId },
      data: {
        [signedAtField]: now,
        status: fullySigned ? 'SIGNED' : 'PARTIALLY_SIGNED',
      },
    });

    if (fullySigned) {
      await tx.project.updateMany({
        where: { id: projectId, transactionStatus: 'CONTRACT_PENDING' },
        data: { transactionStatus: 'PAYMENT_PENDING' },
      });

      await tx.notification.createMany({
        data: [clientId, freelancerId].map((userId) => ({
          userId,
          type: 'CONTRACT_SIGNED' as const,
          title: '계약이 체결되었습니다',
          message: `'${projectTitle}' 프로젝트 계약에 양측이 모두 서명했습니다.`,
          targetUrl: `/contracts/${contractId}`,
        })),
      });
    } else {
      await tx.notification.create({
        data: {
          userId: party === 'CLIENT' ? freelancerId : clientId,
          type: 'CONTRACT_SIGN_REQUEST',
          title: '계약서 서명 요청',
          message: `'${projectTitle}' 프로젝트 계약서에 상대방이 서명했습니다. 서명을 완료해 주세요.`,
          targetUrl: `/contracts/${contractId}`,
        },
      });
    }

    return contract;
  });
}
