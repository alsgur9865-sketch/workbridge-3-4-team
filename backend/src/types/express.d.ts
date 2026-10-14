import type { AuthUser } from '@/types/auth';

declare global {
  namespace Express {
    interface User {
      id: AuthUser['id'];
      role: AuthUser['role'];
    }

    interface AuthInfo {
      accessToken?: string;
      refreshToken?: string;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};