import { AppError } from '@/errors/AppError';
import * as notificationRepository from '@/repositories/notification.repository';

export function getNotifications(userId: string) {
  return notificationRepository.listNotifications(userId);
}

export async function getUnreadCount(userId: string) {
  return {
    count: await notificationRepository.countUnreadNotifications(userId),
  };
}

export async function readNotification(userId: string, notificationId: string) {
  const notification = await notificationRepository.findNotificationForUser(
    userId,
    notificationId,
  );

  if (!notification) {
    throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'The notification does not exist.');
  }

  if (notification.readAt) {
    return notification;
  }

  return notificationRepository.markNotificationRead(notification.id, new Date());
}

export async function readAllNotifications(userId: string) {
  const result = await notificationRepository.markAllNotificationsRead(userId, new Date());

  return {
    updatedCount: result.count,
  };
}
