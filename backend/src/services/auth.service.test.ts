const repositoryMock = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createLocalUser: vi.fn(),
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

import { login, logout, refreshSession, selectRole } from '@/services/auth.service';

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

    const result = await login({ email: 'MIN@example.com', password: 'password123' });

    expect(passwordMock.verifyPassword).toHaveBeenCalledWith('password123', 'hashed-password');
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

    await expect(login({ email: user.email, password: 'wrong' })).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('selects a role once and returns tokens containing the new role', async () => {
    const selectedUser = { ...user, role: 'CLIENT' as const };
    repositoryMock.selectUserRole.mockResolvedValue(selectedUser);

    const result = await selectRole(user.id, 'CLIENT');

    expect(repositoryMock.selectUserRole).toHaveBeenCalledWith(user.id, 'CLIENT');
    expect(tokenMock.signAccessToken).toHaveBeenCalledWith({
      id: user.id,
      role: 'CLIENT',
    });
    expect(result.user.role).toBe('CLIENT');
  });

  it('does not allow an already selected role to be changed', async () => {
    repositoryMock.selectUserRole.mockResolvedValue(null);
    repositoryMock.findUserById.mockResolvedValue(user);

    await expect(selectRole(user.id, 'CLIENT')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ROLE_ALREADY_SELECTED',
    });
  });

  it('rotates a valid refresh token', async () => {
    tokenMock.verifyRefreshToken.mockReturnValue({ userId: user.id });
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
    tokenMock.verifyRefreshToken.mockReturnValue({ userId: user.id });
    tokenMock.hashRefreshToken.mockReturnValue('different-hash');
    repositoryMock.findUserById.mockResolvedValue(user);

    await expect(refreshSession('old-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('clears the stored refresh token on logout', async () => {
    tokenMock.verifyRefreshToken.mockReturnValue({ userId: user.id });
    repositoryMock.clearRefreshTokenHash.mockResolvedValue({ count: 1 });

    await logout('refresh-token');

    expect(repositoryMock.clearRefreshTokenHash).toHaveBeenCalledWith(user.id);
  });
});
