import jwt from 'jsonwebtoken';
import request from 'supertest';

const TEST_SECRET = vi.hoisted(() => {
  const secret = 'test-access-secret-that-is-at-least-32-characters';
  process.env.JWT_ACCESS_SECRET = secret;
  return secret;
});

const userServiceMock = vi.hoisted(() => ({
  getMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  updateClientProfile: vi.fn(),
  updateFreelancerProfile: vi.fn(),
}));

vi.mock('@/services/user.service', () => userServiceMock);

import { app } from '@/app';

const userId = '11111111-1111-4111-8111-111111111111';

function accessToken(role: 'CLIENT' | 'FREELANCER') {
  return jwt.sign({ sub: userId, role }, TEST_SECRET, { expiresIn: '5m' });
}

const clientProfile = {
  id: userId,
  email: 'client@example.com',
  role: 'CLIENT',
  name: 'Client',
  bio: null,
  profileImageUrl: null,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  profile: {
    role: 'CLIENT',
    companyName: 'WorkBridge',
    industry: 'IT',
    websiteUrl: null,
  },
};

describe('user profile routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication to read the current profile', async () => {
    const response = await request(app).get('/api/v1/users/me');

    expect(response.status).toBe(401);
    expect(userServiceMock.getMyProfile).not.toHaveBeenCalled();
  });

  it('returns the current user profile', async () => {
    userServiceMock.getMyProfile.mockResolvedValue(clientProfile);

    const response = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken('CLIENT')}`);

    expect(response.status).toBe(200);
    expect(response.body.data.profile.companyName).toBe('WorkBridge');
    expect(userServiceMock.getMyProfile).toHaveBeenCalledWith(userId);
  });

  it('updates common profile fields', async () => {
    userServiceMock.updateMyProfile.mockResolvedValue({
      ...clientProfile,
      name: 'Updated Client',
      bio: '새로운 소개',
    });

    const response = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken('CLIENT')}`)
      .send({
        name: ' Updated Client ',
        bio: ' 새로운 소개 ',
      });

    expect(response.status).toBe(200);
    expect(userServiceMock.updateMyProfile).toHaveBeenCalledWith(userId, {
      name: 'Updated Client',
      bio: '새로운 소개',
    });
  });

  it('updates a client profile only for a client', async () => {
    userServiceMock.updateClientProfile.mockResolvedValue(clientProfile);

    const response = await request(app)
      .put('/api/v1/users/me/client-profile')
      .set('Authorization', `Bearer ${accessToken('CLIENT')}`)
      .send({
        companyName: 'WorkBridge',
        industry: 'IT',
        websiteUrl: 'https://workbridge.example.com',
      });

    expect(response.status).toBe(200);
    expect(userServiceMock.updateClientProfile).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ companyName: 'WorkBridge', industry: 'IT' }),
    );
  });

  it('rejects a freelancer trying to write a client profile', async () => {
    const response = await request(app)
      .put('/api/v1/users/me/client-profile')
      .set('Authorization', `Bearer ${accessToken('FREELANCER')}`)
      .send({
        companyName: 'Wrong',
        industry: 'IT',
      });

    expect(response.status).toBe(403);
    expect(userServiceMock.updateClientProfile).not.toHaveBeenCalled();
  });

  it('validates freelancer profile categories and numbers', async () => {
    const response = await request(app)
      .put('/api/v1/users/me/freelancer-profile')
      .set('Authorization', `Bearer ${accessToken('FREELANCER')}`)
      .send({
        mainCategory: 'Unknown Category',
        careerYears: -1,
        desiredRate: 0,
        skills: [],
      });

    expect(response.status).toBe(400);
    expect(userServiceMock.updateFreelancerProfile).not.toHaveBeenCalled();
  });
});
