import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: 'CLIENT' | 'FREELANCER' | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isInitialized: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
  finishInitialization: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitialized: false,
  setSession: (accessToken, user) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
  finishInitialization: () => set({ isInitialized: true }),
}));
