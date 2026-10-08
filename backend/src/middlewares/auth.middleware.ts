import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '@/config/env';
import { AppError } from '@/errors/AppError';
import { USER_ROLES, type UserRole } from '@/types/auth';

/**
 * Minimal access-token guard so feature routes can be built before the auth module lands.
 * Expected access token payload: { sub: userId, role: 'CLIENT' | 'FREELANCER' | null }.
 * The auth owner may replace this implementation as long as `request.user` keeps this shape.
 */
const accessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(USER_ROLES).nullable().optional(),
});

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  if (!env.JWT_ACCESS_SECRET) {
    throw new AppError(500, 'AUTH_NOT_CONFIGURED', 'JWT_ACCESS_SECRET is not configured.');
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(authorization.slice('Bearer '.length), env.JWT_ACCESS_SECRET);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired.');
  }

  const payload = accessTokenPayloadSchema.safeParse(decoded);
  if (!payload.success) {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token payload is invalid.');
  }

  request.user = { id: payload.data.sub, role: payload.data.role ?? null };
  next();
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
    }

    if (!request.user.role || !roles.includes(request.user.role)) {
      throw new AppError(403, 'FORBIDDEN', `This action requires the ${roles.join(' or ')} role.`);
    }

    next();
  };
}

export function getAuthUser(request: Express.Request) {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }
  return request.user;
}
