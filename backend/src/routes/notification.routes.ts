import { Router } from 'express';
import * as notificationController from '@/controllers/notification.controller';
import { requireAuth } from '@/middlewares/auth.middleware';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);

notificationRouter.get('/', notificationController.getNotifications);
notificationRouter.get('/unread-count', notificationController.getUnreadCount);
notificationRouter.patch('/read-all', notificationController.readAllNotifications);
notificationRouter.patch('/:notificationId/read', notificationController.readNotification);
