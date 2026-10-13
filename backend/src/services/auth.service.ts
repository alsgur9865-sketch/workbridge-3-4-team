import { AppError } from '@/errors/AppError';
import {
  clearRefreshTokenHash,
  createGoogleUser,
  createLocalUser,
  findUserByEmail,
  findUserByGoogleId,
  findUserById,
  linkGoogleAccount,
  selectUserRole,
  updateRefreshTokenHash,
} from '@/repositories/auth.repository';
import type { LoginInput, SignupInput } from '@/schemas/auth.schema';
import type { UserRole } from '@/types/auth';
import { hashPassword, verifyPassword } from '@/utils/password';
import {
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/utils/token';

function toAuthUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: 'CLIENT' | 'FREELANCER' | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

async function createSession(user: {
  id: string;
  email: string;
  name: string | null;
  role: 'CLIENT' | 'FREELANCER' | null;
}) {
  const accessToken = signAccessToken({
    id: user.id,
    role: user.role,
  });

  const refreshToken = signRefreshToken(user.id);

  await updateRefreshTokenHash(
    user.id,
    hashRefreshToken(refreshToken),
  );

  return {
    user: toAuthUser(user),
    accessToken,
    refreshToken,
  };
}

export interface GoogleProfileInput {
  googleId: string;
  email: string;
  name: string;
  profileImageUrl?: string | null;
}

export async function loginWithGoogle(input: GoogleProfileInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  // 1. 이미 Google 계정으로 가입된 사용자 확인
  const googleUser = await findUserByGoogleId(input.googleId);

  if (googleUser) {
    return createSession(googleUser);
  }

  // 2. 동일한 이메일을 가진 기존 사용자 확인
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    // 이미 다른 OAuth 계정과 연결되어 있다면 충돌 처리
    if (existingUser.oauthProvider) {
      throw new AppError(
        409,
        'OAUTH_ACCOUNT_CONFLICT',
        'This email is already linked to another OAuth account.',
      );
    }

    // 기존 로컬 계정에 Google 계정 연결
    const linkedUser = await linkGoogleAccount(existingUser.id, {
      oauthProviderId: input.googleId,
      profileImageUrl: input.profileImageUrl,
    });

    return createSession(linkedUser);
  }

  // 3. 완전히 새로운 Google 사용자 생성
  const newUser = await createGoogleUser({
    email,
    name,
    oauthProviderId: input.googleId,
    profileImageUrl: input.profileImageUrl,
  });

  return createSession(newUser);
}

export async function signup(input: SignupInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_IN_USE',
      'This email is already registered.',
    );
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await createLocalUser({
      email,
      name,
      passwordHash,
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_IN_USE',
        'This email is already registered.',
      );
    }

    throw error;
  }
}

export async function login(input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const user = await findUserByEmail(email);

  if (
    !user?.passwordHash ||
    !(await verifyPassword(input.password, user.passwordHash))
  ) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Email or password is incorrect.',
    );
  }

  return createSession(user);
}

export async function selectRole(userId: string, role: UserRole) {
  const user = await selectUserRole(userId, role);

  if (!user) {
    const existingUser = await findUserById(userId);

    if (!existingUser) {
      throw new AppError(
        404,
        'USER_NOT_FOUND',
        'The user does not exist.',
      );
    }

    throw new AppError(
      409,
      'ROLE_ALREADY_SELECTED',
      'The user role has already been selected.',
    );
  }

  return createSession(user);
}

export async function refreshSession(refreshToken: string) {
  const { userId } = verifyRefreshToken(refreshToken);
  const user = await findUserById(userId);

  if (
    !user?.refreshTokenHash ||
    user.refreshTokenHash !== hashRefreshToken(refreshToken)
  ) {
    throw new AppError(
      401,
      'INVALID_REFRESH_TOKEN',
      'The refresh token is no longer valid.',
    );
  }

  return createSession(user);
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) {
    return;
  }

  try {
    const { userId } = verifyRefreshToken(refreshToken);
    await clearRefreshTokenHash(userId);
  } catch (error) {
    if (
      error instanceof AppError &&
      (
        error.code === 'INVALID_REFRESH_TOKEN' ||
        error.code === 'AUTH_NOT_CONFIGURED'
      )
    ) {
      return;
    }

    throw error;
  }
}