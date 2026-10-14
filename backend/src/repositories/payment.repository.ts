import { AppError } from '@/errors/AppError';
import { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';

const paymentPartyInclude = {
  contract: {
    include: {
      project: {
        select: {
          id: true,
          title: true,
          clientId: true,
          transactionStatus: true,
          deletedAt: true,
        },
      },
      application: {
        select: {
          freelancerId: true,
        },
      },
    },
  },
} as const;

export function findContractForPayment(contractId: string) {
  return getPrisma().contract.findUnique({
    where: { id: contractId },
    include: {
      payment: true,
      project: {
        select: {
          id: true,
          title: true,
          clientId: true,
          transactionStatus: true,
          deletedAt: true,
        },
      },
      application: {
        select: {
          freelancerId: true,
        },
      },
    },
  });
}

export async function createPayment(params: {
  contractId: string;
  orderId: string;
  amount: Prisma.Decimal;
}) {
  const { contractId, orderId, amount } = params;

  try {
    return await getPrisma().payment.create({
      data: {
        contractId,
        provider: 'TOSS',
        orderId,
        amount,
        status: 'READY',
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await getPrisma().payment.findUnique({ where: { contractId } });
      if (existing) {
        return existing;
      }
    }
    throw error;
  }
}

export function resetFailedPayment(params: {
  paymentId: string;
  orderId: string;
  amount: Prisma.Decimal;
}) {
  const { paymentId, orderId, amount } = params;
  return getPrisma().payment.update({
    where: { id: paymentId },
    data: {
      provider: 'TOSS',
      orderId,
      paymentKey: null,
      amount,
      platformFee: null,
      settlementAmount: null,
      status: 'READY',
      paidAt: null,
      escrowedAt: null,
      releasedAt: null,
      refundedAt: null,
      failureCode: null,
      failureMessage: null,
    },
  });
}

export function findPaymentByOrderId(orderId: string) {
  return getPrisma().payment.findUnique({
    where: { orderId },
    include: paymentPartyInclude,
  });
}

export function findPaymentDetail(paymentId: string) {
  return getPrisma().payment.findUnique({
    where: { id: paymentId },
    include: paymentPartyInclude,
  });
}

export async function markPaymentFailed(params: {
  paymentId: string;
  failureCode: string;
  failureMessage: string;
}) {
  const { paymentId, failureCode, failureMessage } = params;

  await getPrisma().payment.updateMany({
    where: { id: paymentId, status: 'READY' },
    data: {
      status: 'FAILED',
      failureCode: failureCode.slice(0, 100),
      failureMessage,
    },
  });

  return getPrisma().payment.findUniqueOrThrow({ where: { id: paymentId } });
}

export async function completePayment(params: {
  paymentId: string;
  orderId: string;
  paymentKey: string;
  projectId: string;
  projectTitle: string;
  freelancerId: string;
  platformFee: number;
  settlementAmount: number;
}) {
  const {
    paymentId,
    orderId,
    paymentKey,
    projectId,
    projectTitle,
    freelancerId,
    platformFee,
    settlementAmount,
  } = params;

  return getPrisma().$transaction(async (tx) => {
    const now = new Date();

    const paid = await tx.payment.updateMany({
      where: {
        id: paymentId,
        orderId,
        status: 'READY',
      },
      data: {
        paymentKey,
        status: 'PAID',
        paidAt: now,
        platformFee,
        settlementAmount,
        failureCode: null,
        failureMessage: null,
      },
    });

    if (paid.count === 0) {
      throw new AppError(409, 'PAYMENT_NOT_CONFIRMABLE', 'This payment cannot be confirmed.');
    }

    const project = await tx.project.updateMany({
      where: {
        id: projectId,
        transactionStatus: 'PAYMENT_PENDING',
      },
      data: {
        transactionStatus: 'IN_PROGRESS',
      },
    });

    if (project.count === 0) {
      throw new AppError(
        409,
        'PAYMENT_STAGE_CLOSED',
        'The project is no longer waiting for payment.',
      );
    }

    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: 'ESCROWED',
        escrowedAt: now,
      },
    });

    await tx.notification.create({
      data: {
        userId: freelancerId,
        type: 'PAYMENT_COMPLETED',
        title: '결제가 완료되었습니다',
        message: `'${projectTitle}' 프로젝트의 결제가 완료되었습니다. 이제 작업을 시작해 주세요.`,
        targetUrl: `/contracts/${payment.contractId}`,
      },
    });

    return payment;
  });
}
