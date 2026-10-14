import { randomUUID } from 'node:crypto';
import { env } from '@/config/env';
import { AppError } from '@/errors/AppError';
import { confirmTossPayment, TossPaymentApiError } from '@/lib/toss-payments';
import * as paymentRepository from '@/repositories/payment.repository';
import type { ConfirmPaymentInput } from '@/schemas/payment.schema';
import type { AuthUser } from '@/types/auth';

const PLATFORM_FEE_RATE = 0.1;

function createOrderId() {
  return `WB-${randomUUID().replaceAll('-', '')}`;
}

function createOrderName(projectTitle: string) {
  return (projectTitle.trim() || 'WorkBridge 프로젝트').slice(0, 100);
}

function toPaymentDto(
  payment: {
    id: string;
    contractId: string;
    provider: string;
    orderId: string;
    amount: unknown;
    platformFee: unknown | null;
    settlementAmount: unknown | null;
    status: string;
    paidAt: Date | null;
    escrowedAt: Date | null;
    releasedAt: Date | null;
    refundedAt: Date | null;
    failureCode: string | null;
    failureMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  projectTitle: string,
) {
  return {
    id: payment.id,
    contractId: payment.contractId,
    provider: payment.provider,
    orderId: payment.orderId,
    orderName: createOrderName(projectTitle),
    amount: Number(payment.amount),
    platformFee: payment.platformFee === null ? null : Number(payment.platformFee),
    settlementAmount:
      payment.settlementAmount === null ? null : Number(payment.settlementAmount),
    status: payment.status,
    paidAt: payment.paidAt,
    escrowedAt: payment.escrowedAt,
    releasedAt: payment.releasedAt,
    refundedAt: payment.refundedAt,
    failureCode: payment.failureCode,
    failureMessage: payment.failureMessage,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function assertValidAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new AppError(
      409,
      'INVALID_PAYMENT_AMOUNT',
      'The agreed contract amount cannot be used for payment.',
    );
  }
}

export async function preparePayment(user: AuthUser, contractId: string) {
  const contract = await paymentRepository.findContractForPayment(contractId);
  if (!contract || contract.project.deletedAt) {
    throw new AppError(404, 'CONTRACT_NOT_FOUND', 'The contract does not exist.');
  }

  if (contract.project.clientId !== user.id) {
    throw new AppError(403, 'NOT_PROJECT_OWNER', 'Only the project owner can make the payment.');
  }

  if (contract.status !== 'SIGNED') {
    throw new AppError(
      409,
      'CONTRACT_NOT_SIGNED',
      'Both parties must sign the contract before payment.',
    );
  }

  if (contract.project.transactionStatus !== 'PAYMENT_PENDING') {
    throw new AppError(
      409,
      'PAYMENT_STAGE_CLOSED',
      'The project is not waiting for payment.',
    );
  }

  const amount = Number(contract.agreedAmount);
  assertValidAmount(amount);

  if (contract.payment) {
    if (contract.payment.status === 'READY') {
      return {
        created: false,
        data: toPaymentDto(contract.payment, contract.project.title),
      };
    }

    if (contract.payment.status === 'FAILED') {
      const reset = await paymentRepository.resetFailedPayment({
        paymentId: contract.payment.id,
        orderId: createOrderId(),
        amount: contract.agreedAmount,
      });
      return {
        created: true,
        data: toPaymentDto(reset, contract.project.title),
      };
    }

    throw new AppError(
      409,
      'PAYMENT_ALREADY_PROCESSED',
      'A payment for this contract has already been processed.',
    );
  }

  const payment = await paymentRepository.createPayment({
    contractId,
    orderId: createOrderId(),
    amount: contract.agreedAmount,
  });

  if (payment.status !== 'READY') {
    throw new AppError(
      409,
      'PAYMENT_ALREADY_PROCESSED',
      'A payment for this contract has already been processed.',
    );
  }

  return {
    created: true,
    data: toPaymentDto(payment, contract.project.title),
  };
}

export async function confirmPayment(user: AuthUser, input: ConfirmPaymentInput) {
  const payment = await paymentRepository.findPaymentByOrderId(input.orderId);
  if (!payment || payment.contract.project.deletedAt) {
    throw new AppError(404, 'PAYMENT_NOT_FOUND', 'The payment does not exist.');
  }

  const { contract } = payment;
  if (contract.project.clientId !== user.id) {
    throw new AppError(403, 'NOT_PROJECT_OWNER', 'Only the project owner can confirm payment.');
  }

  const storedAmount = Number(payment.amount);
  assertValidAmount(storedAmount);

  if (input.amount !== storedAmount) {
    throw new AppError(
      400,
      'PAYMENT_AMOUNT_MISMATCH',
      'The payment amount does not match the prepared order.',
    );
  }

  if (payment.status === 'ESCROWED' && payment.paymentKey === input.paymentKey) {
    return toPaymentDto(payment, contract.project.title);
  }

  if (payment.status !== 'READY') {
    throw new AppError(409, 'PAYMENT_NOT_CONFIRMABLE', 'This payment cannot be confirmed.');
  }

  if (contract.status !== 'SIGNED' || contract.project.transactionStatus !== 'PAYMENT_PENDING') {
    throw new AppError(
      409,
      'PAYMENT_STAGE_CLOSED',
      'The project is not waiting for payment.',
    );
  }

  if (!env.TOSS_SECRET_KEY) {
    throw new AppError(
      503,
      'TOSS_NOT_CONFIGURED',
      'Toss Payments is not configured on the server.',
    );
  }

  let tossPayment;
  try {
    tossPayment = await confirmTossPayment({
      secretKey: env.TOSS_SECRET_KEY,
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: input.amount,
      idempotencyKey: payment.id,
    });
  } catch (error) {
    if (error instanceof TossPaymentApiError) {
      if (error.status >= 400 && error.status < 500) {
        await paymentRepository.markPaymentFailed({
          paymentId: payment.id,
          failureCode: error.code,
          failureMessage: error.message,
        });
      }

      throw new AppError(
        502,
        error.status >= 500 ? 'TOSS_PAYMENT_UNAVAILABLE' : 'TOSS_PAYMENT_REJECTED',
        error.status >= 500
          ? 'Toss Payments is temporarily unavailable. Please try again.'
          : 'The payment was rejected by Toss Payments.',
      );
    }
    throw error;
  }

  if (
    tossPayment.paymentKey !== input.paymentKey ||
    tossPayment.orderId !== input.orderId ||
    tossPayment.totalAmount !== input.amount
  ) {
    throw new AppError(
      502,
      'TOSS_RESPONSE_MISMATCH',
      'The Toss Payments response did not match the prepared order.',
    );
  }

  const platformFee = Math.floor(storedAmount * PLATFORM_FEE_RATE);
  const settlementAmount = storedAmount - platformFee;

  const completed = await paymentRepository.completePayment({
    paymentId: payment.id,
    orderId: payment.orderId,
    paymentKey: input.paymentKey,
    projectId: contract.project.id,
    projectTitle: contract.project.title,
    freelancerId: contract.application.freelancerId,
    platformFee,
    settlementAmount,
  });

  return toPaymentDto(completed, contract.project.title);
}

export async function getPayment(user: AuthUser, paymentId: string) {
  const payment = await paymentRepository.findPaymentDetail(paymentId);
  if (!payment || payment.contract.project.deletedAt) {
    throw new AppError(404, 'PAYMENT_NOT_FOUND', 'The payment does not exist.');
  }

  const clientId = payment.contract.project.clientId;
  const freelancerId = payment.contract.application.freelancerId;
  if (user.id !== clientId && user.id !== freelancerId) {
    throw new AppError(
      403,
      'NOT_CONTRACT_PARTY',
      'Only the contract parties can view this payment.',
    );
  }

  return toPaymentDto(payment, payment.contract.project.title);
}


/**
 * Marks the MVP settlement record as released after delivery approval.
 *
 * This does not transfer money through Toss Payments. It records WorkBridge's
 * internal escrow/settlement state after the delivery flow has completed.
 */
export async function releasePaymentForContract(contractId: string) {
  const payment = await paymentRepository.findPaymentForSettlement(contractId);

  if (!payment || payment.contract.project.deletedAt) {
    throw new AppError(404, 'PAYMENT_NOT_FOUND', 'The payment does not exist.');
  }

  if (payment.status === 'RELEASED') {
    return toPaymentDto(payment, payment.contract.project.title);
  }

  if (payment.status !== 'ESCROWED') {
    throw new AppError(
      409,
      'PAYMENT_NOT_ESCROWED',
      'Only an escrowed payment can be released.',
    );
  }

  if (!payment.contract.delivery || payment.contract.delivery.status !== 'APPROVED') {
    throw new AppError(
      409,
      'DELIVERY_NOT_APPROVED',
      'The delivery must be approved before settlement.',
    );
  }

  if (payment.contract.project.transactionStatus !== 'COMPLETED') {
    throw new AppError(
      409,
      'PROJECT_NOT_COMPLETED',
      'The project must be completed before settlement.',
    );
  }

  const released = await paymentRepository.releaseEscrowedPayment({
    paymentId: payment.id,
    contractId,
  });

  return toPaymentDto(released, payment.contract.project.title);
}
