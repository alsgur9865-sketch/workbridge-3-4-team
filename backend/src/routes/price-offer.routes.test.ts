import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppError } from '@/errors/AppError';

const TEST_SECRET = vi.hoisted(() => {
  const secret = 'test-access-secret-that-is-at-least-32-characters';
  process.env.JWT_ACCESS_SECRET = secret;
  return secret;
});

vi.mock('@/repositories/application.repository', () => ({
  findApplicationWithProject: vi.fn(),
  findApplicationDetail: vi.fn(),
}));

vi.mock('@/repositories/price-offer.repository', () => ({
  createPriceOffer: vi.fn(),
  acceptPriceOffer: vi.fn(),
  rejectPriceOffer: vi.fn(),
}));

const { app } = await import('@/app');
const applicationRepository = vi.mocked(await import('@/repositories/application.repository'));
const priceOfferRepository = vi.mocked(await import('@/repositories/price-offer.repository'));

const clientId = randomUUID();
const freelancerId = randomUUID();
const projectId = randomUUID();
const applicationId = randomUUID();
const url = `/api/v1/applications/${applicationId}/price-offer`;

function tokenFor(id: string, role: 'CLIENT' | 'FREELANCER') {
  return `Bearer ${jwt.sign({ sub: id, role }, TEST_SECRET, { expiresIn: '5m' })}`;
}

function applicationRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: applicationId,
    projectId,
    freelancerId,
    introduction: '열심히 하겠습니다. 비슷한 프로젝트 경험이 있습니다.',
    proposedAmount: '5000000',
    estimatedDays: 30,
    status: 'ACCEPTED',
    clientOfferAmount: null,
    priceOfferStatus: 'NONE',
    offeredAt: null,
    respondedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function selectedApplication(
  overrides: Record<string, unknown> = {},
  projectOverrides: Record<string, unknown> = {},
) {
  return {
    ...applicationRecord(overrides),
    project: {
      id: projectId,
      clientId,
      title: '테스트 프로젝트',
      transactionStatus: 'PRICE_AGREEMENT',
      selectedApplicationId: applicationId,
      deletedAt: null,
      ...projectOverrides,
    },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /applications/:applicationId/price-offer', () => {
  it('lets the project owner offer a price to the selected applicant', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(selectedApplication());
    priceOfferRepository.createPriceOffer.mockResolvedValue(
      applicationRecord({ clientOfferAmount: '4500000', priceOfferStatus: 'PENDING' }) as never,
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ amount: 4_500_000 });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      clientOfferAmount: 4_500_000,
      priceOfferStatus: 'PENDING',
    });
    expect(priceOfferRepository.createPriceOffer).toHaveBeenCalledWith({
      applicationId,
      amount: 4_500_000,
      freelancerId,
      projectTitle: '테스트 프로젝트',
    });
  });

  it('allows a new offer after the previous one was rejected', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(
      selectedApplication({ priceOfferStatus: 'REJECTED', clientOfferAmount: '3000000' }),
    );
    priceOfferRepository.createPriceOffer.mockResolvedValue(
      applicationRecord({ clientOfferAmount: '4000000', priceOfferStatus: 'PENDING' }) as never,
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ amount: 4_000_000 });

    expect(response.status).toBe(201);
  });

  it('rejects freelancers', async () => {
    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send({ amount: 4_500_000 });
    expect(response.status).toBe(403);
  });

  it('rejects an invalid amount', async () => {
    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ amount: 0 });
    expect(response.status).toBe(400);
  });

  it('rejects other clients', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(selectedApplication());

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(randomUUID(), 'CLIENT'))
      .send({ amount: 4_500_000 });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('NOT_PROJECT_OWNER');
  });

  it('only allows offers to the selected applicant', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(
      selectedApplication({ status: 'REJECTED' }, { selectedApplicationId: randomUUID() }),
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ amount: 4_500_000 });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('APPLICATION_NOT_SELECTED');
  });

  it.each([
    ['PENDING', 'PRICE_OFFER_PENDING'],
    ['ACCEPTED', 'PRICE_ALREADY_AGREED'],
  ])('blocks a new offer while the current one is %s', async (priceOfferStatus, code) => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(
      selectedApplication({ priceOfferStatus }),
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ amount: 4_500_000 });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe(code);
    expect(priceOfferRepository.createPriceOffer).not.toHaveBeenCalled();
  });

  it('blocks offers once the project left the price agreement stage', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(
      selectedApplication({}, { transactionStatus: 'CONTRACT_PENDING' }),
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ amount: 4_500_000 });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PRICE_AGREEMENT_CLOSED');
  });
});

describe('PATCH /applications/:applicationId/price-offer', () => {
  const pendingOffer = () =>
    selectedApplication({ priceOfferStatus: 'PENDING', clientOfferAmount: '4500000' });

  it('lets the applicant accept the offer', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(pendingOffer());
    priceOfferRepository.acceptPriceOffer.mockResolvedValue(
      applicationRecord({ clientOfferAmount: '4500000', priceOfferStatus: 'ACCEPTED' }) as never,
    );

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send({ status: 'ACCEPTED' });

    expect(response.status).toBe(200);
    expect(response.body.data.priceOfferStatus).toBe('ACCEPTED');
    expect(priceOfferRepository.acceptPriceOffer).toHaveBeenCalledWith({
      applicationId,
      projectId,
      clientId,
      projectTitle: '테스트 프로젝트',
    });
    expect(priceOfferRepository.rejectPriceOffer).not.toHaveBeenCalled();
  });

  it('lets the applicant reject the offer', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(pendingOffer());
    priceOfferRepository.rejectPriceOffer.mockResolvedValue(
      applicationRecord({ clientOfferAmount: '4500000', priceOfferStatus: 'REJECTED' }) as never,
    );

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send({ status: 'REJECTED' });

    expect(response.status).toBe(200);
    expect(response.body.data.priceOfferStatus).toBe('REJECTED');
  });

  it('rejects other freelancers', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(pendingOffer());

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(randomUUID(), 'FREELANCER'))
      .send({ status: 'ACCEPTED' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('NOT_APPLICANT');
  });

  it('returns 409 when there is no pending offer', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(selectedApplication());

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send({ status: 'ACCEPTED' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('NO_PENDING_PRICE_OFFER');
  });

  it('surfaces conflicts raised inside the accept transaction', async () => {
    applicationRepository.findApplicationWithProject.mockResolvedValue(pendingOffer());
    priceOfferRepository.acceptPriceOffer.mockRejectedValue(
      new AppError(409, 'PRICE_AGREEMENT_CLOSED', 'The project is no longer in this stage.'),
    );

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send({ status: 'ACCEPTED' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PRICE_AGREEMENT_CLOSED');
  });
});

describe('GET /applications/:applicationId', () => {
  const detail = () =>
    ({
      ...applicationRecord({ priceOfferStatus: 'PENDING', clientOfferAmount: '4500000' }),
      freelancer: {
        id: freelancerId,
        name: '김프리',
        profileImageUrl: null,
        freelancerProfile: { mainCategory: '웹 개발', careerYears: 3 },
      },
      project: {
        id: projectId,
        title: '테스트 프로젝트',
        budget: '5000000',
        clientId,
        recruitmentStatus: 'CLOSED',
        transactionStatus: 'PRICE_AGREEMENT',
        workStartAt: new Date('2026-11-01T00:00:00.000Z'),
        workEndAt: new Date('2026-12-01T00:00:00.000Z'),
        selectedApplicationId: applicationId,
        deletedAt: null,
      },
    }) as never;

  it.each([
    ['project owner', () => tokenFor(clientId, 'CLIENT')],
    ['applicant', () => tokenFor(freelancerId, 'FREELANCER')],
  ])('is visible to the %s', async (_label, token) => {
    applicationRepository.findApplicationDetail.mockResolvedValue(detail());

    const response = await request(app)
      .get(`/api/v1/applications/${applicationId}`)
      .set('Authorization', token());

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      clientOfferAmount: 4_500_000,
      freelancer: { name: '김프리', careerYears: 3 },
      project: { title: '테스트 프로젝트', budget: 5_000_000, isSelected: true },
    });
  });

  it('is hidden from other users', async () => {
    applicationRepository.findApplicationDetail.mockResolvedValue(detail());

    const response = await request(app)
      .get(`/api/v1/applications/${applicationId}`)
      .set('Authorization', tokenFor(randomUUID(), 'FREELANCER'));
    expect(response.status).toBe(403);
  });
});
