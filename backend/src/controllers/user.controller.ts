import type { RequestHandler } from 'express';
import { getAuthUser } from '@/middlewares/auth.middleware';
import {
  updateClientProfileSchema,
  updateFreelancerProfileSchema,
  updateUserSchema,
} from '@/schemas/user.schema';
import * as userService from '@/services/user.service';

export const getMyProfile: RequestHandler = async (request, response) => {
  const data = await userService.getMyProfile(getAuthUser(request).id);
  response.json({ success: true, data });
};

export const updateMyProfile: RequestHandler = async (request, response) => {
  const input = updateUserSchema.parse(request.body);
  const data = await userService.updateMyProfile(getAuthUser(request).id, input);
  response.json({ success: true, data });
};

export const updateClientProfile: RequestHandler = async (request, response) => {
  const input = updateClientProfileSchema.parse(request.body);
  const data = await userService.updateClientProfile(getAuthUser(request).id, input);
  response.json({ success: true, data });
};

export const updateFreelancerProfile: RequestHandler = async (request, response) => {
  const input = updateFreelancerProfileSchema.parse(request.body);
  const data = await userService.updateFreelancerProfile(getAuthUser(request).id, input);
  response.json({ success: true, data });
};
