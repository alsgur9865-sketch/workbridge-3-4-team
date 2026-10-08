import { createHash } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '@/config/env';
import { AppError } from '@/errors/AppError';
import { USER_ROLES, type AuthUser } from '@/types/auth';

const accessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(USER_ROLES).nullable().optional(),
  tokenType: z.literal('access').optional(),
});

const refreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  tokenType: z.literal('refresh'),
});

function getAccessSecret() {
  if (!env.JWT_ACCESS_SECRET) {
    throw new AppError(500, 'AUTH_NOT_CONFIGURED', 'JWT_ACCESS_SECRET is not configured.');
  }
  return env.JWT_ACCESS_SECRET;
}

function getRefreshSecret() {
  if (!env.JWT_REFRESH_SECRET) {
    throw new AppError(500, 'AUTH_NOT_CONFIGURED', 'JWT_REFRESH_SECRET is not configured.');
  }
  return env.JWT_REFRESH_SECRET;
}

function asExpiresIn(value: string): SignOptions['expiresIn'] {
  return value as SignOptions['expiresIn'];
}

export function signAccessToken(user: AuthUser) {
  return jwt.sign(
    {
      role: user.role,
      tokenType: 'access',
    },
    getAccessSecret(),
    {
      subject: user.id,
      expiresIn: asExpiresIn(env.JWT_ACCESS_EXPIRES_IN),
    },
  );
}

export function signRefreshToken(userId: string) {
  return jwt.sign(
    {
      tokenType: 'refresh',
    },
    getRefreshSecret(),
    {
      subject: userId,
      expiresIn: asExpiresIn(env.JWT_REFRESH_EXPIRES_IN),
    },
  );
}

export function verifyAccessToken(token: string): AuthUser {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, getAccessSecret());
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token is invalid or expired.');
  }

  const payload = accessTokenPayloadSchema.safeParse(decoded);
  if (!payload.success) {
    throw new AppError(401, 'INVALID_TOKEN', 'The access token payload is invalid.');
  }

  return {
    id: payload.data.sub,
    role: payload.data.role ?? null,
  };
}

export function verifyRefreshToken(token: string) {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, getRefreshSecret());
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'The refresh token is invalid or expired.');
  }

  const payload = refreshTokenPayloadSchema.safeParse(decoded);
  if (!payload.success) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'The refresh token payload is invalid.');
  }

  return {
    userId: payload.data.sub,
  };
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshTokenMaxAgeMs() {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES_IN.trim());
  if (!match) {
    return 14 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit];

  return value * multiplier;
}
