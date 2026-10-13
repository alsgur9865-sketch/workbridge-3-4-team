import { Router } from 'express';
import * as userController from '@/controllers/user.controller';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';

export const userRouter = Router();

userRouter.get('/me', requireAuth, userController.getMyProfile);
userRouter.patch('/me', requireAuth, userController.updateMyProfile);

userRouter.put(
  '/me/client-profile',
  requireAuth,
  requireRole('CLIENT'),
  userController.updateClientProfile,
);

userRouter.put(
  '/me/freelancer-profile',
  requireAuth,
  requireRole('FREELANCER'),
  userController.updateFreelancerProfile,
);
