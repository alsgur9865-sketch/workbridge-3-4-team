import { AppError } from '@/errors/AppError';
import * as applicationRepository from '@/repositories/application.repository';
import * as priceOfferRepository from '@/repositories/price-offer.repository';
import type { PriceOfferResponse } from '@/schemas/price-offer.schema';
import { toApplicationDto } from '@/services/application.service';
import type { AuthUser } from '@/types/auth';

async function getSelectedApplication(applicationId: string) {
  const application = await applicationRepository.findApplicationWithProject(applicationId);
  if (!application || application.project.deletedAt) {
    throw new AppError(404, 'APPLICATION_NOT_FOUND', 'The application does not exist.');
  }
  return application;
}

export async function offerPrice(user: AuthUser, applicationId: string, amount: number) {
  const application = await getSelectedApplication(applicationId);
  const { project } = application;

  if (project.clientId !== user.id) {
    throw new AppError(403, 'NOT_PROJECT_OWNER', 'Only the project owner can offer a price.');
  }

  if (application.status !== 'ACCEPTED' || project.selectedApplicationId !== application.id) {
    throw new AppError(
      409,
      'APPLICATION_NOT_SELECTED',
      'A price can only be offered to the selected applicant.',
    );
  }

  if (project.transactionStatus !== 'PRICE_AGREEMENT') {
    throw new AppError(
      409,
      'PRICE_AGREEMENT_CLOSED',
      'The project is not in the price agreement stage.',
    );
  }

  if (application.priceOfferStatus === 'PENDING') {
    throw new AppError(
      409,
      'PRICE_OFFER_PENDING',
      'Wait for the freelancer to respond to the current offer.',
    );
  }

  if (application.priceOfferStatus === 'ACCEPTED') {
    throw new AppError(409, 'PRICE_ALREADY_AGREED', 'The price has already been agreed.');
  }

  const offered = await priceOfferRepository.createPriceOffer({
    applicationId,
    amount,
    freelancerId: application.freelancerId,
    projectTitle: project.title,
  });
  return toApplicationDto(offered);
}

export async function respondToPriceOffer(
  user: AuthUser,
  applicationId: string,
  response: PriceOfferResponse,
) {
  const application = await getSelectedApplication(applicationId);
  const { project } = application;

  if (application.freelancerId !== user.id) {
    throw new AppError(403, 'NOT_APPLICANT', 'Only the applicant can respond to the offer.');
  }

  if (application.priceOfferStatus !== 'PENDING') {
    throw new AppError(409, 'NO_PENDING_PRICE_OFFER', 'There is no pending price offer.');
  }

  // Both accepting and rejecting are only valid while the selected application is
  // still in the price agreement stage.
  if (
    project.transactionStatus !== 'PRICE_AGREEMENT' ||
    project.selectedApplicationId !== application.id
  ) {
    throw new AppError(
      409,
      'PRICE_AGREEMENT_CLOSED',
      'The project is not in the price agreement stage.',
    );
  }

  const params = {
    applicationId,
    projectId: project.id,
    clientId: project.clientId,
    projectTitle: project.title,
  };
  const updated =
    response === 'ACCEPTED'
      ? await priceOfferRepository.acceptPriceOffer(params)
      : await priceOfferRepository.rejectPriceOffer(params);
  return toApplicationDto(updated);
}
