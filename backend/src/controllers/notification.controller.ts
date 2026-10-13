import type { RequestHandler } from 'express';
import { getAuthUser } from '@/middlewares/auth.middleware';
import { notificationIdSchema } from '@/schemas/notification.schema';
import * as notificationService from '@/services/notification.service';

export const getNotifications: RequestHandler = async (request, response) => {
  const data = await notificationService.getNotifications(getAuthUser(request).id);
  response.json({ success: true, data });
};

export const getUnreadCount: RequestHandler = async (request, response) => {
  const data = await notificationService.getUnreadCount(getAuthUser(request).id);
  response.json({ success: true, data });
};

export const readNotification: RequestHandler = async (request, response) => {
  const notificationId = notificationIdSchema.parse(request.params.notificationId);
  const data = await notificationService.readNotification(
    getAuthUser(request).id,
    notificationId,
  );
  response.json({ success: true, data });
};

export const readAllNotifications: RequestHandler = async (request, response) => {
  const data = await notificationService.readAllNotifications(getAuthUser(request).id);
  response.json({ success: true, data });
};
