import { getPrisma } from '@/lib/prisma';

export function listNotifications(userId: string) {
  return getPrisma().notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
  });
}

export function countUnreadNotifications(userId: string) {
  return getPrisma().notification.count({
    where: {
      userId,
      readAt: null,
    },
  });
}

export function findNotificationForUser(userId: string, notificationId: string) {
  return getPrisma().notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });
}

export function markNotificationRead(notificationId: string, readAt: Date) {
  return getPrisma().notification.update({
    where: { id: notificationId },
    data: { readAt },
  });
}

export function markAllNotificationsRead(userId: string, readAt: Date) {
  return getPrisma().notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: { readAt },
  });
}
