import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppError } from '@/errors/AppError';

const TEST_SECRET = vi.hoisted(() => {
  const secret = 'test-access-secret-that-is-at-least-32-characters';
  process.env.JWT_ACCESS_SECRET = secret;
  return secret;
});

vi.mock('@/repositories/contract.repository', () => ({
  findApplicationForContract: vi.fn(),
  createContract: vi.fn(),
  findContractDetail: vi.fn(),
  signContract: vi.fn(),
}));

const { app } = await import('@/app');
const repository = vi.mocked(await import('@/repositories/contract.repository'));

const clientId = randomUUID();
const freelancerId = randomUUID();
const projectId = randomUUID();
const applicationId = randomUUID();
const contractId = randomUUID();
const workStartAt = new Date('2026-11-01T00:00:00.000Z');
const workEndAt = new Date('2026-12-15T00:00:00.000Z');
const terms = '작업 범위: 매칭 대시보드 화면 5종 개발 및 배포까지 포함합니다.';

function tokenFor(id: string, role: 'CLIENT' | 'FREELANCER') {
  return `Bearer ${jwt.sign({ sub: id, role }, TEST_SECRET, { expiresIn: '5m' })}`;
}

function agreedApplication(
  overrides: Record<string, unknown> = {},
  projectOverrides: Record<string, unknown> = {},
) {
  return {
    id: applicationId,
    projectId,
    freelancerId,
    status: 'ACCEPTED',
    priceOfferStatus: 'ACCEPTED',
    clientOfferAmount: '4500000',
    contract: null,
    freelancer: { id: freelancerId, name: '김프리', email: 'free@example.com' },
    project: {
      id: projectId,
      clientId,
      title: '테스트 프로젝트',
      transactionStatus: 'CONTRACT_PENDING',
      selectedApplicationId: applicationId,
      workStartAt,
      workEndAt,
      deletedAt: null,
      client: { id: clientId, name: null, email: 'client@example.com' },
      ...projectOverrides,
    },
    ...overrides,
  } as never;
}

function contractRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: contractId,
    projectId,
    applicationId,
    agreedAmount: '4500000',
    contractStartAt: workStartAt,
    contractEndAt: workEndAt,
    contractContent: {
      projectTitle: '테스트 프로젝트',
      clientName: 'client@example.com',
      freelancerName: '김프리',
      terms,
    },
    clientSignedAt: null,
    freelancerSignedAt: null,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function contractDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...contractRecord(overrides),
    project: { id: projectId, title: '테스트 프로젝트', clientId, deletedAt: null },
    application: { id: applicationId, freelancerId },
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /contracts', () => {
  it('creates a contract from the agreed price with the project period by default', async () => {
    repository.findApplicationForContract.mockResolvedValue(agreedApplication());
    repository.createContract.mockResolvedValue(contractRecord() as never);

    const response = await request(app)
      .post('/api/v1/contracts')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ applicationId, terms });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: contractId,
      agreedAmount: 4_500_000,
      status: 'DRAFT',
      clientId,
      freelancerId,
    });
    expect(repository.createContract).toHaveBeenCalledWith({
      projectId,
      applicationId,
      freelancerId,
      agreedAmount: '4500000',
      contractStartAt: workStartAt,
      contractEndAt: workEndAt,
      content: {
        projectTitle: '테스트 프로젝트',
        clientName: 'client@example.com',
        freelancerName: '김프리',
        terms,
      },
    });
  });

  it('uses custom contract dates when provided', async () => {
    repository.findApplicationForContract.mockResolvedValue(agreedApplication());
    repository.createContract.mockResolvedValue(contractRecord() as never);

    await request(app)
      .post('/api/v1/contracts')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({
        applicationId,
        terms,
        contractStartAt: '2026-11-05T00:00:00.000Z',
        contractEndAt: '2026-12-20T00:00:00.000Z',
      });

    expect(repository.createContract).toHaveBeenCalledWith(
      expect.objectContaining({
        contractStartAt: new Date('2026-11-05T00:00:00.000Z'),
        contractEndAt: new Date('2026-12-20T00:00:00.000Z'),
      }),
    );
  });

  it('rejects an end date before the start date', async () => {
    repository.findApplicationForContract.mockResolvedValue(agreedApplication());

    const response = await request(app)
      .post('/api/v1/contracts')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({
        applicationId,
        terms,
        contractStartAt: '2026-12-20T00:00:00.000Z',
        contractEndAt: '2026-11-05T00:00:00.000Z',
      });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_CONTRACT_PERIOD');
  });

  it('rejects freelancers and other clients', async () => {
    const asFreelancer = await request(app)
      .post('/api/v1/contracts')
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send({ applicationId, terms });
    expect(asFreelancer.status).toBe(403);

    repository.findApplicationForContract.mockResolvedValue(agreedApplication());
    const asOtherClient = await request(app)
      .post('/api/v1/contracts')
      .set('Authorization', tokenFor(randomUUID(), 'CLIENT'))
      .send({ applicationId, terms });
    expect(asOtherClient.status).toBe(403);
    expect(asOtherClient.body.error.code).toBe('NOT_PROJECT_OWNER');
  });

  it('requires an agreed price', async () => {
    repository.findApplicationForContract.mockResolvedValue(
      agreedApplication({ priceOfferStatus: 'PENDING' }, { transactionStatus: 'PRICE_AGREEMENT' }),
    );

    const response = await request(app)
      .post('/api/v1/contracts')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ applicationId, terms });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PRICE_NOT_AGREED');
  });

  it('blocks a second contract for the same application', async () => {
    repository.findApplicationForContract.mockResolvedValue(
      agreedApplication({ contract: { id: contractId } }),
    );

    const response = await request(app)
      .post('/api/v1/contracts')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ applicationId, terms });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONTRACT_ALREADY_EXISTS');
    expect(repository.createContract).not.toHaveBeenCalled();
  });

  it('validates the terms', async () => {
    const response = await request(app)
      .post('/api/v1/contracts')
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ applicationId, terms: '짧음' });
    expect(response.status).toBe(400);
  });
});

describe('GET /contracts/:contractId', () => {
  it.each([
    ['client', () => tokenFor(clientId, 'CLIENT')],
    ['freelancer', () => tokenFor(freelancerId, 'FREELANCER')],
  ])('is visible to the %s', async (_label, token) => {
    repository.findContractDetail.mockResolvedValue(contractDetail());

    const response = await request(app)
      .get(`/api/v1/contracts/${contractId}`)
      .set('Authorization', token());

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      projectTitle: '테스트 프로젝트',
      agreedAmount: 4_500_000,
      content: { terms },
    });
  });

  it('is hidden from everyone else', async () => {
    repository.findContractDetail.mockResolvedValue(contractDetail());

    const response = await request(app)
      .get(`/api/v1/contracts/${contractId}`)
      .set('Authorization', tokenFor(randomUUID(), 'CLIENT'));
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('NOT_CONTRACT_PARTY');
  });

  it('returns 404 for an unknown contract', async () => {
    repository.findContractDetail.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/v1/contracts/${contractId}`)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));
    expect(response.status).toBe(404);
  });
});

describe('POST /contracts/:contractId/sign', () => {
  const url = `/api/v1/contracts/${contractId}/sign`;

  it('signs as the client', async () => {
    repository.findContractDetail.mockResolvedValue(contractDetail());
    repository.signContract.mockResolvedValue(
      contractRecord({ status: 'PARTIALLY_SIGNED', clientSignedAt: new Date() }) as never,
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('PARTIALLY_SIGNED');
    expect(repository.signContract).toHaveBeenCalledWith({
      contractId,
      party: 'CLIENT',
      projectId,
      projectTitle: '테스트 프로젝트',
      clientId,
      freelancerId,
    });
  });

  it('signs as the freelancer', async () => {
    repository.findContractDetail.mockResolvedValue(
      contractDetail({ status: 'PARTIALLY_SIGNED', clientSignedAt: new Date() }),
    );
    repository.signContract.mockResolvedValue(
      contractRecord({
        status: 'SIGNED',
        clientSignedAt: new Date(),
        freelancerSignedAt: new Date(),
      }) as never,
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('SIGNED');
    expect(repository.signContract).toHaveBeenCalledWith(
      expect.objectContaining({ party: 'FREELANCER' }),
    );
  });

  it('does not let outsiders sign', async () => {
    repository.findContractDetail.mockResolvedValue(contractDetail());

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(randomUUID(), 'FREELANCER'));
    expect(response.status).toBe(403);
    expect(repository.signContract).not.toHaveBeenCalled();
  });

  it('surfaces a duplicate signature', async () => {
    repository.findContractDetail.mockResolvedValue(contractDetail());
    repository.signContract.mockRejectedValue(
      new AppError(409, 'ALREADY_SIGNED', 'You have already signed this contract.'),
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ALREADY_SIGNED');
  });
});
