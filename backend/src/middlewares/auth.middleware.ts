import type { RequestHandler } from 'express';
import { AppError } from '@/errors/AppError';
import { type UserRole } from '@/types/auth';
import { verifyAccessToken } from '@/utils/token';

export const optionalAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.headers.authorization;
  if (!authorization) {
    next();
    return;
  }

  if (!authorization.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  request.user = verifyAccessToken(authorization.slice('Bearer '.length));
  next();
};

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required.');
  }

  request.user = verifyAccessToken(authorization.slice('Bearer '.length));
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
