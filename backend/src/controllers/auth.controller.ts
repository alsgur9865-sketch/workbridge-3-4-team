import type { CookieOptions, RequestHandler, Response } from 'express';
import { allowedOrigins, env } from '@/config/env';
import { AppError } from '@/errors/AppError';
import { getAuthUser } from '@/middlewares/auth.middleware';
import { loginSchema, selectRoleSchema, signupSchema } from '@/schemas/auth.schema';
import { login, logout, refreshSession, selectRole, signup } from '@/services/auth.service';
import { refreshTokenMaxAgeMs } from '@/utils/token';

const REFRESH_COOKIE_NAME = 'workbridge_refresh_token';

function refreshCookieOptions(): CookieOptions {
  const isProduction = env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/api/v1/auth',
    maxAge: refreshTokenMaxAgeMs(),
  };
}

function setRefreshCookie(response: Response, refreshToken: string) {
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(response: Response) {
  const options = refreshCookieOptions();
  delete options.maxAge;
  response.clearCookie(REFRESH_COOKIE_NAME, options);
}

export const signupController: RequestHandler = async (request, response) => {
  const input = signupSchema.parse(request.body);
  const user = await signup(input);

  response.status(201).json({
    success: true,
    data: {
      user,
    },
  });
};

export const loginController: RequestHandler = async (request, response) => {
  const input = loginSchema.parse(request.body);
  const session = await login(input);

  setRefreshCookie(response, session.refreshToken);

  response.json({
    success: true,
    data: {
      user: session.user,
      accessToken: session.accessToken,
    },
  });
};

export const selectRoleController: RequestHandler = async (request, response) => {
  const input = selectRoleSchema.parse(request.body);
  const authUser = getAuthUser(request);
  const session = await selectRole(authUser.id, input.role);

  setRefreshCookie(response, session.refreshToken);

  response.json({
    success: true,
    data: {
      user: session.user,
      accessToken: session.accessToken,
    },
  });
};

export const refreshController: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  if (!refreshToken) {
    throw new AppError(401, 'REFRESH_TOKEN_REQUIRED', 'A refresh token is required.');
  }

  const session = await refreshSession(refreshToken);
  setRefreshCookie(response, session.refreshToken);

  response.json({
    success: true,
    data: {
      user: session.user,
      accessToken: session.accessToken,
    },
  });
};

export const logoutController: RequestHandler = async (request, response) => {
  const refreshToken = request.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  await logout(refreshToken);
  clearRefreshCookie(response);

  response.json({
    success: true,
  });
};

export const googleCallbackController: RequestHandler = async (request, response) => {
  const refreshToken = request.authInfo?.refreshToken;

  if (!request.user || !refreshToken) {
    throw new AppError(
      401,
      'GOOGLE_AUTH_FAILED',
      'Google authentication failed.',
    );
  }

  setRefreshCookie(response, refreshToken);

  const frontendUrl = allowedOrigins[0] ?? 'http://localhost:3000';

  response.redirect(`${frontendUrl}/oauth/callback`);
};