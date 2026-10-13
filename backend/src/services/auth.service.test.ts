const repositoryMock = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  findUserByGoogleId: vi.fn(),
  createLocalUser: vi.fn(),
  createGoogleUser: vi.fn(),
  linkGoogleAccount: vi.fn(),
  selectUserRole: vi.fn(),
  updateRefreshTokenHash: vi.fn(),
  clearRefreshTokenHash: vi.fn(),
}));

const passwordMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

const tokenMock = vi.hoisted(() => ({
  hashRefreshToken: vi.fn(),
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('@/repositories/auth.repository', () => repositoryMock);
vi.mock('@/utils/password', () => passwordMock);
vi.mock('@/utils/token', () => tokenMock);

import {
  login,
  loginWithGoogle,
  logout,
  refreshSession,
  selectRole,
} from '@/services/auth.service';

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'min@example.com',
  passwordHash: 'hashed-password',
  role: 'FREELANCER' as const,
  name: 'Min',
  bio: null,
  profileImageUrl: null,
  oauthProvider: null,
  oauthProviderId: null,
  refreshTokenHash: 'stored-refresh-hash',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const googleUser = {
  ...user,
  passwordHash: null,
  role: null,
  oauthProvider: 'GOOGLE' as const,
  oauthProviderId: 'google-user-123',
  profileImageUrl: 'https://example.com/profile.jpg',
};

describe('auth service sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    tokenMock.signAccessToken.mockReturnValue('access-token');
    tokenMock.signRefreshToken.mockReturnValue('refresh-token');
    tokenMock.hashRefreshToken.mockReturnValue('stored-refresh-hash');

    repositoryMock.updateRefreshTokenHash.mockResolvedValue(user);
  });

  it('logs in with a valid local password and stores a hashed refresh token', async () => {
    repositoryMock.findUserByEmail.mockResolvedValue(user);
    passwordMock.verifyPassword.mockResolvedValue(true);

    const result = await login({
      email: 'MIN@example.com',
      password: 'password123',
    });

    expect(passwordMock.verifyPassword).toHaveBeenCalledWith(
      'password123',
      'hashed-password',
    );

    expect(repositoryMock.updateRefreshTokenHash).toHaveBeenCalledWith(
      user.id,
      'stored-refresh-hash',
    );

    expect(result).toEqual({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('rejects invalid credentials without revealing which field failed', async () => {
    repositoryMock.findUserByEmail.mockResolvedValue(user);
    passwordMock.verifyPassword.mockResolvedValue(false);

    await expect(
      login({
        email: user.email,
        password: 'wrong',
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('selects a role once and returns tokens containing the new role', async () => {
    const selectedUser = {
      ...user,
      role: 'CLIENT' as const,
    };

    repositoryMock.selectUserRole.mockResolvedValue(selectedUser);

    const result = await selectRole(user.id, 'CLIENT');

    expect(repositoryMock.selectUserRole).toHaveBeenCalledWith(
      user.id,
      'CLIENT',
    );

    expect(tokenMock.signAccessToken).toHaveBeenCalledWith({
      id: user.id,
      role: 'CLIENT',
    });

    expect(result.user.role).toBe('CLIENT');
  });

  it('does not allow an already selected role to be changed', async () => {
    repositoryMock.selectUserRole.mockResolvedValue(null);
    repositoryMock.findUserById.mockResolvedValue(user);

    await expect(
      selectRole(user.id, 'CLIENT'),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'ROLE_ALREADY_SELECTED',
    });
  });

  it('rotates a valid refresh token', async () => {
    tokenMock.verifyRefreshToken.mockReturnValue({
      userId: user.id,
    });

    repositoryMock.findUserById.mockResolvedValue(user);

    const result = await refreshSession('old-refresh-token');

    expect(repositoryMock.findUserById).toHaveBeenCalledWith(user.id);

    expect(repositoryMock.updateRefreshTokenHash).toHaveBeenCalledWith(
      user.id,
      'stored-refresh-hash',
    );

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
  });

  it('rejects a refresh token that no longer matches the stored hash', async () => {
    tokenMock.verifyRefreshToken.mockReturnValue({
      userId: user.id,
    });

    tokenMock.hashRefreshToken.mockReturnValue('different-hash');
    repositoryMock.findUserById.mockResolvedValue(user);

    await expect(
      refreshSession('old-refresh-token'),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('clears the stored refresh token on logout', async () => {
    tokenMock.verifyRefreshToken.mockReturnValue({
      userId: user.id,
    });

    repositoryMock.clearRefreshTokenHash.mockResolvedValue({
      count: 1,
    });

    await logout('refresh-token');

    expect(repositoryMock.clearRefreshTokenHash).toHaveBeenCalledWith(
      user.id,
    );
  });

  it('logs in an existing Google user without creating a new account', async () => {
    repositoryMock.findUserByGoogleId.mockResolvedValue(googleUser);

    const result = await loginWithGoogle({
      googleId: 'google-user-123',
      email: 'min@example.com',
      name: 'Min',
      profileImageUrl: 'https://example.com/profile.jpg',
    });

    expect(repositoryMock.findUserByGoogleId).toHaveBeenCalledWith(
      'google-user-123',
    );

    expect(repositoryMock.findUserByEmail).not.toHaveBeenCalled();
    expect(repositoryMock.createGoogleUser).not.toHaveBeenCalled();
    expect(repositoryMock.linkGoogleAccount).not.toHaveBeenCalled();

    expect(result.user).toEqual({
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      role: googleUser.role,
    });
  });

  it('creates a new user when the Google account does not exist', async () => {
    repositoryMock.findUserByGoogleId.mockResolvedValue(null);
    repositoryMock.findUserByEmail.mockResolvedValue(null);
    repositoryMock.createGoogleUser.mockResolvedValue(googleUser);

    const result = await loginWithGoogle({
      googleId: 'google-user-123',
      email: 'MIN@example.com',
      name: ' Min ',
      profileImageUrl: 'https://example.com/profile.jpg',
    });

    expect(repositoryMock.createGoogleUser).toHaveBeenCalledWith({
      email: 'min@example.com',
      name: 'Min',
      oauthProviderId: 'google-user-123',
      profileImageUrl: 'https://example.com/profile.jpg',
    });

    expect(result.user.role).toBeNull();

    expect(repositoryMock.updateRefreshTokenHash).toHaveBeenCalledWith(
      googleUser.id,
      'stored-refresh-hash',
    );
  });

  it('links Google to an existing local account with the same email', async () => {
    const localUser = {
      ...user,
      oauthProvider: null,
      oauthProviderId: null,
    };

    const linkedUser = {
      ...localUser,
      oauthProvider: 'GOOGLE' as const,
      oauthProviderId: 'google-user-123',
      profileImageUrl: 'https://example.com/profile.jpg',
    };

    repositoryMock.findUserByGoogleId.mockResolvedValue(null);
    repositoryMock.findUserByEmail.mockResolvedValue(localUser);
    repositoryMock.linkGoogleAccount.mockResolvedValue(linkedUser);

    const result = await loginWithGoogle({
      googleId: 'google-user-123',
      email: 'min@example.com',
      name: 'Min',
      profileImageUrl: 'https://example.com/profile.jpg',
    });

    expect(repositoryMock.linkGoogleAccount).toHaveBeenCalledWith(
      localUser.id,
      {
        oauthProviderId: 'google-user-123',
        profileImageUrl: 'https://example.com/profile.jpg',
      },
    );

    expect(repositoryMock.createGoogleUser).not.toHaveBeenCalled();

    expect(result.user.id).toBe(localUser.id);
  });

  it('rejects Google login when the email is linked to another OAuth provider', async () => {
    const kakaoUser = {
      ...user,
      passwordHash: null,
      oauthProvider: 'KAKAO' as const,
      oauthProviderId: 'kakao-user-123',
    };

    repositoryMock.findUserByGoogleId.mockResolvedValue(null);
    repositoryMock.findUserByEmail.mockResolvedValue(kakaoUser);

    await expect(
      loginWithGoogle({
        googleId: 'google-user-123',
        email: 'min@example.com',
        name: 'Min',
        profileImageUrl: null,
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'OAUTH_ACCOUNT_CONFLICT',
    });

    expect(repositoryMock.linkGoogleAccount).not.toHaveBeenCalled();
    expect(repositoryMock.createGoogleUser).not.toHaveBeenCalled();
  });
});