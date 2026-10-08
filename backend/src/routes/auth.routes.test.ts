import request from 'supertest';
import { AppError } from '@/errors/AppError';

const authServiceMock = vi.hoisted(() => ({
  signup: vi.fn(),
}));

vi.mock('@/services/auth.service', () => authServiceMock);

import { app } from '@/app';

describe('auth routes', () => {
  beforeEach(() => {
    authServiceMock.signup.mockReset();
  });

  it('creates a local account', async () => {
    authServiceMock.signup.mockResolvedValue({
      id: 'user-1',
      email: 'min@example.com',
      name: 'Min',
      role: null,
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
      data: {
        user: {
          id: 'user-1',
          email: 'min@example.com',
          name: 'Min',
          role: null,
        },
      },
    });
    expect(authServiceMock.signup).toHaveBeenCalledOnce();
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
});
