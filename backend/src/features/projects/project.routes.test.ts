import jwt from 'jsonwebtoken';
import request from 'supertest';

const TEST_SECRET = vi.hoisted(() => {
  const secret = 'test-access-secret-that-is-at-least-32-characters';
  process.env.JWT_ACCESS_SECRET = secret;
  return secret;
});

const projectServiceMock = vi.hoisted(() => ({
  addProjectBookmark: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn(),
  getProject: vi.fn(),
  listProjects: vi.fn(),
  removeProjectBookmark: vi.fn(),
  updateProject: vi.fn(),
}));

const priceAnalysisServiceMock = vi.hoisted(() => ({
  estimateProjectPrice: vi.fn(),
}));

vi.mock('@/features/projects/project.service', () => projectServiceMock);
vi.mock('@/features/projects/price-analysis.service', () => priceAnalysisServiceMock);

import { app } from '@/app';

const clientId = '11111111-1111-4111-8111-111111111111';
const freelancerId = '22222222-2222-4222-8222-222222222222';
const projectId = '33333333-3333-4333-8333-333333333333';

const validProject = {
  title: '쇼핑몰 관리자 대시보드 개발',
  description: '주문과 재고를 한눈에 확인할 수 있는 반응형 관리자 화면을 개발합니다.',
  category: 'Web Development',
  budget: 5_000_000,
  recruitmentDeadline: '2030-01-10T09:00:00.000Z',
  workStartAt: '2030-01-15T09:00:00.000Z',
  workEndAt: '2030-03-01T09:00:00.000Z',
  skills: ['React', 'TypeScript'],
};

function accessToken(userId: string, role: 'CLIENT' | 'FREELANCER') {
  return jwt.sign({ sub: userId, role, tokenType: 'access' }, TEST_SECRET, { expiresIn: '5m' });
}

describe('project routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an invalid project id before querying the database', async () => {
    const response = await request(app).get('/api/v1/projects/not-a-project-id');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('requires authentication to create a project', async () => {
    const response = await request(app).post('/api/v1/projects').send(validProject);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(projectServiceMock.createProject).not.toHaveBeenCalled();
  });

  it('allows only a client to create a project with request.user', async () => {
    const freelancerResponse = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken(freelancerId, 'FREELANCER')}`)
      .send(validProject);

    expect(freelancerResponse.status).toBe(403);
    expect(freelancerResponse.body.error.code).toBe('FORBIDDEN');

    projectServiceMock.createProject.mockResolvedValue({ id: projectId });
    const clientResponse = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken(clientId, 'CLIENT')}`)
      .send(validProject);

    expect(clientResponse.status).toBe(201);
    expect(projectServiceMock.createProject).toHaveBeenCalledWith(
      clientId,
      expect.objectContaining({ title: validProject.title }),
    );
  });

  it('uses the authenticated user when adding a bookmark', async () => {
    const response = await request(app)
      .post(`/api/v1/projects/${projectId}/bookmark`)
      .set('Authorization', `Bearer ${accessToken(freelancerId, 'FREELANCER')}`);

    expect(response.status).toBe(201);
    expect(projectServiceMock.addProjectBookmark).toHaveBeenCalledWith(projectId, freelancerId);
  });

  it('allows only a client to request an AI price estimate', async () => {
    priceAnalysisServiceMock.estimateProjectPrice.mockResolvedValue({
      estimatedTotalAmount: 5_000_000,
    });

    const response = await request(app)
      .post('/api/v1/projects/price-estimate')
      .set('Authorization', `Bearer ${accessToken(clientId, 'CLIENT')}`)
      .send({
        title: validProject.title,
        description: validProject.description,
        category: validProject.category,
        estimatedDays: 30,
        skills: validProject.skills,
      });

    expect(response.status).toBe(200);
    expect(priceAnalysisServiceMock.estimateProjectPrice).toHaveBeenCalledWith(
      clientId,
      expect.objectContaining({ title: validProject.title }),
    );
  });

  it('uses an optional authenticated viewer for public project lists', async () => {
    projectServiceMock.listProjects.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 12, total: 0, totalPages: 0 },
    });

    const response = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken(freelancerId, 'FREELANCER')}`);

    expect(response.status).toBe(200);
    expect(projectServiceMock.listProjects).toHaveBeenCalledWith(expect.any(Object), freelancerId);
  });
});
