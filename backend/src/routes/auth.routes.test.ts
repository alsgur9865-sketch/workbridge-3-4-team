import request from 'supertest';
import { AppError } from '@/errors/AppError';

const authServiceMock = vi.hoisted(() => ({
  signup: vi.fn(),
  login: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/services/auth.service', () => authServiceMock);

import { app } from '@/app';

const testUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'min@example.com',
  name: 'Min',
  role: null,
};

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a local account', async () => {
    authServiceMock.signup.mockResolvedValue({
      ...testUser,
      createdAt: new Date('2026-10-08T00:00:00.000Z'),
    });

    const response = await request(app).post('/api/v1/auth/signup').send({
      email: 'MIN@example.com',
      password: 'password123',
      name: 'Min',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: { user: testUser },
    });
  });

  it('rejects invalid signup input', async () => {
    const response = await request(app).post('/api/v1/auth/signup').send({
      email: 'not-an-email',
      password: 'short',
      name: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(authServiceMock.signup).not.toHaveBeenCalled();
  });

  it('returns conflict when the email is already registered', async () => {
    authServiceMock.signup.mockRejectedValue(
      new AppError(409, 'EMAIL_ALREADY_IN_USE', 'This email is already registered.'),
    );

    const response = await request(app).post('/api/v1/auth/signup').send({
      email: 'min@example.com',
      password: 'password123',
      name: 'Min',
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_IN_USE');
  });

  it('logs in and sets the refresh token cookie', async () => {
    authServiceMock.login.mockResolvedValue({
      user: testUser,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'min@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      user: testUser,
      accessToken: 'access-token',
    });
    expect(response.headers['set-cookie']?.[0]).toContain('workbridge_refresh_token=refresh-token');
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('refreshes a session from the cookie', async () => {
    authServiceMock.refreshSession.mockResolvedValue({
      user: testUser,
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'workbridge_refresh_token=old-refresh-token');

    expect(response.status).toBe(200);
    expect(authServiceMock.refreshSession).toHaveBeenCalledWith('old-refresh-token');
    expect(response.body.data.accessToken).toBe('new-access-token');
    expect(response.headers['set-cookie']?.[0]).toContain(
      'workbridge_refresh_token=new-refresh-token',
    );
  });

  it('rejects refresh without a cookie', async () => {
    const response = await request(app).post('/api/v1/auth/refresh');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('REFRESH_TOKEN_REQUIRED');
  });

  it('logs out and clears the refresh cookie', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', 'workbridge_refresh_token=refresh-token');

    expect(response.status).toBe(200);
    expect(authServiceMock.logout).toHaveBeenCalledWith('refresh-token');
    expect(response.headers['set-cookie']?.[0]).toContain('workbridge_refresh_token=');
  });
});
