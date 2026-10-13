import { AppError } from '@/errors/AppError';
import { getPrisma } from '@/lib/prisma';

/**
 * Records the client's final price offer. A new offer is only allowed when no offer
 * exists yet or the previous one was rejected, so concurrent offers cannot overwrite
 * a pending or agreed price.
 */
export async function createPriceOffer(params: {
  applicationId: string;
  amount: number;
  freelancerId: string;
  projectTitle: string;
}) {
  const { applicationId, amount, freelancerId, projectTitle } = params;

  return getPrisma().$transaction(async (tx) => {
    const offered = await tx.application.updateMany({
      where: {
        id: applicationId,
        status: 'ACCEPTED',
        priceOfferStatus: { in: ['NONE', 'REJECTED'] },
      },
      data: {
        clientOfferAmount: amount,
        priceOfferStatus: 'PENDING',
        offeredAt: new Date(),
        respondedAt: null,
      },
    });
    if (offered.count === 0) {
      throw new AppError(409, 'PRICE_OFFER_NOT_AVAILABLE', 'A price offer cannot be made now.');
    }

    await tx.notification.create({
      data: {
        userId: freelancerId,
        type: 'PRICE_OFFERED',
        title: '최종 금액 제안이 도착했습니다',
        message: `'${projectTitle}' 프로젝트의 의뢰인이 ${amount.toLocaleString('ko-KR')}원을 제안했습니다.`,
        targetUrl: `/applications/${applicationId}/price`,
      },
    });

    return tx.application.findUniqueOrThrow({ where: { id: applicationId } });
  });
}

/**
 * Accepting the offer fixes the price and moves the project to CONTRACT_PENDING
 * in the same transaction.
 */
export async function acceptPriceOffer(params: {
  applicationId: string;
  projectId: string;
  clientId: string;
  projectTitle: string;
}) {
  const { applicationId, projectId, clientId, projectTitle } = params;

  return getPrisma().$transaction(async (tx) => {
    const accepted = await tx.application.updateMany({
      where: { id: applicationId, priceOfferStatus: 'PENDING' },
      data: { priceOfferStatus: 'ACCEPTED', respondedAt: new Date() },
    });
    if (accepted.count === 0) {
      throw new AppError(409, 'NO_PENDING_PRICE_OFFER', 'There is no pending price offer.');
    }

    const project = await tx.project.updateMany({
      where: {
        id: projectId,
        selectedApplicationId: applicationId,
        transactionStatus: 'PRICE_AGREEMENT',
      },
      data: { transactionStatus: 'CONTRACT_PENDING' },
    });
    if (project.count === 0) {
      throw new AppError(
        409,
        'PRICE_AGREEMENT_CLOSED',
        'The project is no longer in the price agreement stage.',
      );
    }

    await tx.notification.create({
      data: {
        userId: clientId,
        type: 'PRICE_OFFER_ACCEPTED',
        title: '금액 제안이 수락되었습니다',
        message: `'${projectTitle}' 프로젝트의 최종 금액이 확정되었습니다. 계약을 진행해 주세요.`,
        targetUrl: `/applications/${applicationId}/price`,
      },
    });

    return tx.application.findUniqueOrThrow({ where: { id: applicationId } });
  });
}

export async function rejectPriceOffer(params: {
  applicationId: string;
  clientId: string;
  projectTitle: string;
}) {
  const { applicationId, clientId, projectTitle } = params;

  return getPrisma().$transaction(async (tx) => {
    const rejected = await tx.application.updateMany({
      where: { id: applicationId, priceOfferStatus: 'PENDING' },
      data: { priceOfferStatus: 'REJECTED', respondedAt: new Date() },
    });
    if (rejected.count === 0) {
      throw new AppError(409, 'NO_PENDING_PRICE_OFFER', 'There is no pending price offer.');
    }

    await tx.notification.create({
      data: {
        userId: clientId,
        type: 'PRICE_OFFER_REJECTED',
        title: '금액 제안이 거절되었습니다',
        message: `'${projectTitle}' 프로젝트의 금액 제안이 거절되었습니다. 다시 제안할 수 있습니다.`,
        targetUrl: `/applications/${applicationId}/price`,
      },
    });

    return tx.application.findUniqueOrThrow({ where: { id: applicationId } });
  });
}
