import jwt from 'jsonwebtoken';
import request from 'supertest';

const TEST_SECRET = vi.hoisted(() => {
  const secret = 'test-access-secret-that-is-at-least-32-characters';
  process.env.JWT_ACCESS_SECRET = secret;
  return secret;
});

const notificationServiceMock = vi.hoisted(() => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  readNotification: vi.fn(),
  readAllNotifications: vi.fn(),
}));

vi.mock('@/services/notification.service', () => notificationServiceMock);

import { app } from '@/app';

const userId = '11111111-1111-4111-8111-111111111111';
const notificationId = '22222222-2222-4222-8222-222222222222';

function accessToken() {
  return jwt.sign({ sub: userId, role: 'CLIENT' }, TEST_SECRET, { expiresIn: '5m' });
}

describe('notification routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/v1/notifications');

    expect(response.status).toBe(401);
    expect(notificationServiceMock.getNotifications).not.toHaveBeenCalled();
  });

  it('returns the current user notifications', async () => {
    notificationServiceMock.getNotifications.mockResolvedValue([
      {
        id: notificationId,
        type: 'NEW_APPLICATION',
        title: '새 지원자가 있습니다.',
        message: '프로젝트에 새로운 지원자가 있습니다.',
        targetUrl: '/projects/project-1/applications',
        readAt: null,
        createdAt: new Date('2026-10-13T00:00:00.000Z'),
      },
    ]);

    const response = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(notificationServiceMock.getNotifications).toHaveBeenCalledWith(userId);
  });

  it('returns the unread notification count', async () => {
    notificationServiceMock.getUnreadCount.mockResolvedValue({ count: 5 });

    const response = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ count: 5 });
  });

  it('marks a single notification as read', async () => {
    notificationServiceMock.readNotification.mockResolvedValue({
      id: notificationId,
      readAt: new Date('2026-10-13T01:00:00.000Z'),
    });

    const response = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(notificationServiceMock.readNotification).toHaveBeenCalledWith(
      userId,
      notificationId,
    );
  });

  it('rejects an invalid notification id', async () => {
    const response = await request(app)
      .patch('/api/v1/notifications/not-a-uuid/read')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(400);
    expect(notificationServiceMock.readNotification).not.toHaveBeenCalled();
  });

  it('marks all notifications as read', async () => {
    notificationServiceMock.readAllNotifications.mockResolvedValue({
      updatedCount: 4,
    });

    const response = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${accessToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ updatedCount: 4 });
    expect(notificationServiceMock.readAllNotifications).toHaveBeenCalledWith(userId);
  });
});
