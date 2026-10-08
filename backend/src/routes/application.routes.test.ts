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
  findProjectForApplication: vi.fn(),
  findApplicationByProjectAndFreelancer: vi.fn(),
  createApplication: vi.fn(),
  listApplicationsByProject: vi.fn(),
  listApplicationsByFreelancer: vi.fn(),
  findApplicationWithProject: vi.fn(),
  acceptApplication: vi.fn(),
  rejectApplication: vi.fn(),
}));

const { app } = await import('@/app');
const repository = vi.mocked(await import('@/repositories/application.repository'));

const clientId = randomUUID();
const freelancerId = randomUUID();
const projectId = randomUUID();
const applicationId = randomUUID();

function tokenFor(id: string, role: 'CLIENT' | 'FREELANCER') {
  return `Bearer ${jwt.sign({ sub: id, role }, TEST_SECRET, { expiresIn: '5m' })}`;
}

function openProject(overrides: Record<string, unknown> = {}) {
  return {
    id: projectId,
    clientId,
    title: '테스트 프로젝트',
    recruitmentStatus: 'OPEN',
    recruitmentDeadline: new Date(Date.now() + 86_400_000),
    transactionStatus: 'NONE',
    selectedApplicationId: null,
    deletedAt: null,
    ...overrides,
  } as never;
}

function applicationRecord(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: applicationId,
    projectId,
    freelancerId,
    introduction: '열심히 하겠습니다. 비슷한 프로젝트 경험이 있습니다.',
    proposedAmount: '3000000',
    estimatedDays: 30,
    status: 'PENDING',
    clientOfferAmount: null,
    priceOfferStatus: 'NONE',
    offeredAt: null,
    respondedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as never;
}

const validBody = {
  introduction: '열심히 하겠습니다. 비슷한 프로젝트 경험이 있습니다.',
  proposedAmount: 3_000_000,
  estimatedDays: 30,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /projects/:projectId/applications', () => {
  const url = `/api/v1/projects/${projectId}/applications`;

  it('requires authentication', async () => {
    const response = await request(app).post(url).send(validBody);
    expect(response.status).toBe(401);
  });

  it('rejects clients', async () => {
    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send(validBody);
    expect(response.status).toBe(403);
  });

  it('validates the request body', async () => {
    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send({ introduction: '짧음', proposedAmount: -1, estimatedDays: 0 });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates an application for an open project', async () => {
    repository.findProjectForApplication.mockResolvedValue(openProject());
    repository.findApplicationByProjectAndFreelancer.mockResolvedValue(null);
    repository.createApplication.mockResolvedValue(applicationRecord());

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send(validBody);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: applicationId,
      proposedAmount: 3_000_000,
      status: 'PENDING',
    });
    expect(repository.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ projectId, clientId, freelancerId, input: validBody }),
    );
  });

  it('returns 404 for a deleted project', async () => {
    repository.findProjectForApplication.mockResolvedValue(openProject({ deletedAt: new Date() }));

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send(validBody);
    expect(response.status).toBe(404);
  });

  it('returns 409 when recruitment is closed', async () => {
    repository.findProjectForApplication.mockResolvedValue(
      openProject({ recruitmentDeadline: new Date(Date.now() - 1000) }),
    );

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send(validBody);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('RECRUITMENT_CLOSED');
  });

  it('returns 409 for a duplicate application', async () => {
    repository.findProjectForApplication.mockResolvedValue(openProject());
    repository.findApplicationByProjectAndFreelancer.mockResolvedValue({ id: applicationId });

    const response = await request(app)
      .post(url)
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'))
      .send(validBody);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ALREADY_APPLIED');
    expect(repository.createApplication).not.toHaveBeenCalled();
  });
});

describe('GET /projects/:projectId/applications', () => {
  const url = `/api/v1/projects/${projectId}/applications`;

  it('only allows the project owner', async () => {
    repository.findProjectForApplication.mockResolvedValue(openProject());

    const response = await request(app)
      .get(url)
      .set('Authorization', tokenFor(randomUUID(), 'CLIENT'));
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('NOT_PROJECT_OWNER');
  });

  it('lists applications with freelancer summaries', async () => {
    repository.findProjectForApplication.mockResolvedValue(openProject());
    repository.listApplicationsByProject.mockResolvedValue([
      {
        ...(applicationRecord() as object),
        freelancer: {
          id: freelancerId,
          name: '김프리',
          profileImageUrl: null,
          freelancerProfile: { mainCategory: '웹 개발', careerYears: 3 },
        },
      },
    ] as never);

    const response = await request(app)
      .get(`${url}?status=PENDING`)
      .set('Authorization', tokenFor(clientId, 'CLIENT'));

    expect(response.status).toBe(200);
    expect(response.body.data[0].freelancer).toEqual({
      id: freelancerId,
      name: '김프리',
      profileImageUrl: null,
      mainCategory: '웹 개발',
      careerYears: 3,
    });
    expect(repository.listApplicationsByProject).toHaveBeenCalledWith(projectId, 'PENDING');
  });
});

describe('GET /applications/me', () => {
  it('lists the freelancer applications with project summaries', async () => {
    repository.listApplicationsByFreelancer.mockResolvedValue([
      {
        ...(applicationRecord() as object),
        project: {
          id: projectId,
          title: '테스트 프로젝트',
          budget: '5000000',
          recruitmentStatus: 'OPEN',
          transactionStatus: 'NONE',
        },
      },
    ] as never);

    const response = await request(app)
      .get('/api/v1/applications/me')
      .set('Authorization', tokenFor(freelancerId, 'FREELANCER'));

    expect(response.status).toBe(200);
    expect(response.body.data[0].project).toMatchObject({
      title: '테스트 프로젝트',
      budget: 5_000_000,
    });
    expect(repository.listApplicationsByFreelancer).toHaveBeenCalledWith(freelancerId, undefined);
  });
});

describe('PATCH /applications/:applicationId/status', () => {
  const url = `/api/v1/applications/${applicationId}/status`;

  function withProject(overrides: Record<string, unknown> = {}) {
    return {
      ...(applicationRecord(overrides) as object),
      project: {
        id: projectId,
        clientId,
        title: '테스트 프로젝트',
        transactionStatus: 'NONE',
        selectedApplicationId: null,
        deletedAt: null,
      },
    } as never;
  }

  it('accepts a pending application', async () => {
    repository.findApplicationWithProject.mockResolvedValue(withProject());
    repository.acceptApplication.mockResolvedValue(applicationRecord({ status: 'ACCEPTED' }));

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ status: 'ACCEPTED' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ACCEPTED');
    expect(repository.acceptApplication).toHaveBeenCalledWith({
      applicationId,
      projectId,
      projectTitle: '테스트 프로젝트',
      freelancerId,
    });
  });

  it('rejects a pending application', async () => {
    repository.findApplicationWithProject.mockResolvedValue(withProject());
    repository.rejectApplication.mockResolvedValue(applicationRecord({ status: 'REJECTED' }));

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ status: 'REJECTED' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('REJECTED');
    expect(repository.acceptApplication).not.toHaveBeenCalled();
  });

  it('does not let another client decide', async () => {
    repository.findApplicationWithProject.mockResolvedValue(withProject());

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(randomUUID(), 'CLIENT'))
      .send({ status: 'ACCEPTED' });
    expect(response.status).toBe(403);
  });

  it('returns 409 for an already processed application', async () => {
    repository.findApplicationWithProject.mockResolvedValue(withProject({ status: 'REJECTED' }));

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ status: 'ACCEPTED' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('APPLICATION_ALREADY_PROCESSED');
  });

  it('surfaces conflicts raised inside the accept transaction', async () => {
    repository.findApplicationWithProject.mockResolvedValue(withProject());
    repository.acceptApplication.mockRejectedValue(
      new AppError(409, 'APPLICANT_ALREADY_SELECTED', 'An applicant was already selected.'),
    );

    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ status: 'ACCEPTED' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('APPLICANT_ALREADY_SELECTED');
  });

  it('rejects an invalid status value', async () => {
    const response = await request(app)
      .patch(url)
      .set('Authorization', tokenFor(clientId, 'CLIENT'))
      .send({ status: 'PENDING' });
    expect(response.status).toBe(400);
  });
});
