export const USER_ROLES = ['CLIENT', 'FREELANCER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AuthUser {
  id: string;
  role: UserRole | null;
}
