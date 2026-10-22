import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppError } from '@/errors/AppError';

const TEST_SECRET = vi.hoisted(() => {
  const secret = 'test-access-secret-that-is-at-least-32-characters';
  process.env.JWT_ACCESS_SECRET = secret;
  return secret;
});

vi.mock('@/repositories/review.repository', () => ({
  findContractForReview: vi.fn(),
  createReview: vi.fn(),
  listContractReviews: vi.fn(),
  findUserForReviews: vi.fn(),
  listUserReviews: vi.fn(),
  getPublicReviewHighlights: vi.fn(),
}));

const { app } = await import('@/app');
const repository = vi.mocked(await import('@/repositories/review.repository'));

const clientId = randomUUID();
const freelancerId = randomUUID();
const contractId = randomUUID();
const url = `/api/v1/contracts/${contractId}/reviews`;
const validBody = {
  rating: 5,
  content: '요구사항을 정확히 이해하고 일정보다 빠르게 납품해 주셨습니다.',
  tags: ['빠른 소통', '일정 준수'],
};

function tokenFor(id: string, role: 'CLIENT' | 'FREELANCER') {
  return `Bearer ${jwt.sign({ sub: id, role }, TEST_SECRET, { expiresIn: '5m' })}`;
}

function completedContract(transactionStatus = 'COMPLETED') {
  return {
    id: contractId,
    project: {
      id: randomUUID(),
      title: '테스트 프로젝트',
      clientId,
      transactionStatus,
      deletedAt: null,
      client: { id: clientId, name: '김의뢰' },
    },
    application: { freelancerId, freelancer: { id: freelancerId, name: '김프리' } },
  } as never;
}

function reviewRecord(reviewerId: string, revieweeId: string, overrides = {}) {
  return {
    id: randomUUID(),
    contractId,
    reviewerId,
    revieweeId,
    rating: 5,
    content: validBody.content,
    tags: validBody.tags,
    reviewer: { id: reviewerId, name: '작성자', role: 'CLIENT' },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /contracts/:contractId/reviews', () => {
  it('lets the client review the freelancer', async () => {
    repository.findContractForReview.mockResolvedValue(completedContract());
    repository.createReview.mockResolvedValue(reviewRecord(clientId, freelancerId));

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send(validBody);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ rating: 5, tags: ['빠른 소통', '일정 준수'] });
    expect(repository.createReview).toHaveBeenCalledWith({
      contractId,
      reviewerId: clientId,
      revieweeId: freelancerId,
      input: validBody,
    });
  });

  it('lets the freelancer review the client', async () => {
    repository.findContractForReview.mockResolvedValue(completedContract());
    repository.createReview.mockResolvedValue(reviewRecord(freelancerId, clientId));

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send(validBody);

    expect(response.status).toBe(201);
    expect(repository.createReview).toHaveBeenCalledWith(
      expect.objectContaining({ reviewerId: freelancerId, revieweeId: clientId }),
    );
  });

  it('only allows reviews after the project is completed', async () => {
    repository.findContractForReview.mockResolvedValue(completedContract('IN_PROGRESS'));

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send(validBody);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PROJECT_NOT_COMPLETED');
    expect(repository.createReview).not.toHaveBeenCalled();
  });

  it('rejects users who are not part of the contract', async () => {
    repository.findContractForReview.mockResolvedValue(completedContract());

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(randomUUID(), 'CLIENT'))
      .send(validBody);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('NOT_CONTRACT_PARTY');
  });

  it('blocks reviewing yourself', async () => {
    const selfContract = {
      ...(completedContract() as object),
      application: { freelancerId: clientId, freelancer: { id: clientId, name: '김의뢰' } },
    } as never;
    repository.findContractForReview.mockResolvedValue(selfContract);

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send(validBody);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('CANNOT_REVIEW_SELF');
  });

  it('surfaces a duplicate review from the unique constraint', async () => {
    repository.findContractForReview.mockResolvedValue(completedContract());
    repository.createReview.mockRejectedValue(
      new AppError(409, 'ALREADY_REVIEWED', 'You have already reviewed this contract.'),
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send(validBody);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ALREADY_REVIEWED');
  });

  it.each([
    [{ ...validBody, rating: 0 }],
    [{ ...validBody, rating: 6 }],
    [{ ...validBody, rating: 4.5 }],
    [{ ...validBody, content: '짧음' }],
    [{ ...validBody, tags: ['없는 태그'] }],
  ])('validates the review body %#', async (body) => {
    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send(body);

    expect(response.status).toBe(400);
    expect(repository.createReview).not.toHaveBeenCalled();
  });

  it('removes duplicated tags', async () => {
    repository.findContractForReview.mockResolvedValue(completedContract());
    repository.createReview.mockResolvedValue(reviewRecord(clientId, freelancerId));

    await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ ...validBody, tags: ['일정 준수', '일정 준수'] });

    expect(repository.createReview).toHaveBeenCalledWith(
      expect.objectContaining({ input: { ...validBody, tags: ['일정 준수'] } }),
    );
  });
});

describe('GET /contracts/:contractId/reviews', () => {
  it('tells the party whether they can still write a review', async () => {
    repository.findContractForReview.mockResolvedValue(completedContract());
    repository.listContractReviews.mockResolvedValue([reviewRecord(freelancerId, clientId)]);

    const response = await request(app).get(url).set('Authorization', tokenFor(clientId, 'CLIENT'));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      isProjectCompleted: true,
      canWrite: true,
      myReview: null,
      counterpart: { id: freelancerId, name: '김프리' },
    });
    expect(response.body.data.reviews).toHaveLength(1);
  });

  it('closes writing once the user has reviewed', async () => {
    repository.findContractForReview.mockResolvedValue(completedContract());
    repository.listContractReviews.mockResolvedValue([reviewRecord(clientId, freelancerId)]);

    const response = await request(app).get(url).set('Authorization', tokenFor(clientId, 'CLIENT'));

    expect(response.body.data.canWrite).toBe(false);
    expect(response.body.data.myReview).toMatchObject({ reviewerId: clientId });
  });

  it('is hidden from outsiders', async () => {
    repository.findContractForReview.mockResolvedValue(completedContract());

    const response = await request(app)
      .get(url)
      .set('Authorization', tokenFor(randomUUID(), 'FREELANCER'));
    expect(response.status).toBe(403);
  });
});

describe('GET /users/:userId/reviews', () => {
  it('returns the rating summary and recent reviews', async () => {
    repository.findUserForReviews.mockResolvedValue({
      id: freelancerId,
      name: '김프리',
      role: 'FREELANCER',
    });
    repository.listUserReviews.mockResolvedValue({
      averageRating: 4.666666,
      reviewCount: 3,
      reviews: [
        {
          ...(reviewRecord(clientId, freelancerId) as object),
          contract: { project: { id: 'project-1', title: '테스트 프로젝트' } },
        },
      ],
    } as never);

    const response = await request(app)
      .get(`/api/v1/users/${freelancerId}/reviews`)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      averageRating: 4.7,
      reviewCount: 3,
      user: { name: '김프리' },
    });
    expect(response.body.data.reviews[0].project.title).toBe('테스트 프로젝트');
  });

  it('returns null average for a user without reviews', async () => {
    repository.findUserForReviews.mockResolvedValue({ id: clientId, name: null, role: 'CLIENT' });
    repository.listUserReviews.mockResolvedValue({
      averageRating: null,
      reviewCount: 0,
      reviews: [],
    });

    const response = await request(app)
      .get(`/api/v1/users/${clientId}/reviews`)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));

    expect(response.body.data).toMatchObject({ averageRating: null, reviewCount: 0 });
  });

  it('returns 404 for an unknown user', async () => {
    repository.findUserForReviews.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/v1/users/${randomUUID()}/reviews`)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));
    expect(response.status).toBe(404);
  });
});

describe('GET /reviews/highlights', () => {
  it('returns privacy-safe review proof without authentication', async () => {
    repository.getPublicReviewHighlights.mockResolvedValue({
      averageRating: 4.75,
      reviewCount: 2,
      demoReviewCount: 0,
      completedProjectCount: 1,
      reviews: [
        {
          id: randomUUID(),
          rating: 5,
          content: '일정과 요구사항을 정확히 맞춰 만족스럽게 완료했습니다.',
          tags: ['일정 준수', '높은 완성도'],
          createdAt: new Date('2026-10-20T00:00:00.000Z'),
          reviewer: { role: 'CLIENT', email: 'client@example.com' },
          contract: { project: { id: randomUUID(), title: '브랜드 웹사이트 구축' } },
        },
      ],
    } as never);

    const response = await request(app).get('/api/v1/reviews/highlights');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      averageRating: 4.8,
      reviewCount: 2,
      completedProjectCount: 1,
      includesDemoData: false,
      hasOnlyDemoReviews: false,
    });
    expect(response.body.data.reviews[0]).toMatchObject({
      reviewerRole: 'CLIENT',
      project: { title: '브랜드 웹사이트 구축' },
    });
    expect(response.body.data.reviews[0]).not.toHaveProperty('reviewer.email');
  });

  it('labels test-project reviews as demo content', async () => {
    repository.getPublicReviewHighlights.mockResolvedValue({
      averageRating: 5,
      reviewCount: 1,
      demoReviewCount: 1,
      completedProjectCount: 1,
      reviews: [
        {
          id: randomUUID(),
          rating: 5,
          content: '[테스트 리뷰] 요구사항이 명확했습니다.',
          tags: ['요구사항 명확'],
          createdAt: new Date('2026-10-20T00:00:00.000Z'),
          reviewer: { role: 'FREELANCER', email: 'tester@example.com' },
          contract: {
            project: { id: randomUUID(), title: '[테스트] 관리자 대시보드 개발' },
          },
        },
      ],
    } as never);

    const response = await request(app).get('/api/v1/reviews/highlights');

    expect(response.status).toBe(200);
    expect(response.body.data.includesDemoData).toBe(true);
    expect(response.body.data.hasOnlyDemoReviews).toBe(true);
    expect(response.body.data.reviews[0].isDemo).toBe(true);
  });
});
