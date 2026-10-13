const repositoryMock = vi.hoisted(() => ({
  listNotifications: vi.fn(),
  countUnreadNotifications: vi.fn(),
  findNotificationForUser: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

vi.mock('@/repositories/notification.repository', () => repositoryMock);

import {
  getNotifications,
  getUnreadCount,
  readAllNotifications,
  readNotification,
} from '@/services/notification.service';

const notification = {
  id: '22222222-2222-4222-8222-222222222222',
  userId: '11111111-1111-4111-8111-111111111111',
  type: 'NEW_APPLICATION' as const,
  title: '새 지원자가 있습니다.',
  message: '프로젝트에 새로운 지원자가 있습니다.',
  targetUrl: '/projects/project-1/applications',
  readAt: null,
  createdAt: new Date('2026-10-13T00:00:00.000Z'),
};

describe('notification service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns notifications and unread count for the current user', async () => {
    repositoryMock.listNotifications.mockResolvedValue([notification]);
    repositoryMock.countUnreadNotifications.mockResolvedValue(3);

    await expect(getNotifications(notification.userId)).resolves.toEqual([notification]);
    await expect(getUnreadCount(notification.userId)).resolves.toEqual({ count: 3 });
  });

  it('marks an unread notification as read', async () => {
    repositoryMock.findNotificationForUser.mockResolvedValue(notification);
    repositoryMock.markNotificationRead.mockImplementation(
      async (_notificationId: string, readAt: Date) => ({
        ...notification,
        readAt,
      }),
    );

    const result = await readNotification(notification.userId, notification.id);

    expect(repositoryMock.markNotificationRead).toHaveBeenCalledWith(
      notification.id,
      expect.any(Date),
    );
    expect(result.readAt).toBeInstanceOf(Date);
  });

  it('returns an already-read notification without rewriting it', async () => {
    const readAt = new Date('2026-10-13T01:00:00.000Z');
    repositoryMock.findNotificationForUser.mockResolvedValue({
      ...notification,
      readAt,
    });

    const result = await readNotification(notification.userId, notification.id);

    expect(result.readAt).toEqual(readAt);
    expect(repositoryMock.markNotificationRead).not.toHaveBeenCalled();
  });

  it('rejects a notification that does not belong to the current user', async () => {
    repositoryMock.findNotificationForUser.mockResolvedValue(null);

    await expect(
      readNotification(notification.userId, notification.id),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOTIFICATION_NOT_FOUND',
    });
  });

  it('marks all unread notifications as read', async () => {
    repositoryMock.markAllNotificationsRead.mockResolvedValue({ count: 4 });

    await expect(readAllNotifications(notification.userId)).resolves.toEqual({
      updatedCount: 4,
    });
  });
});
