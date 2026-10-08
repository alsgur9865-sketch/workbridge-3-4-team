import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';
import type { AuthUser } from '@/stores/auth.store';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  name: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export async function login(input: LoginInput) {
  const response = await apiClient.post<ApiResponse<AuthSession>>('/auth/login', input);
  return response.data.data;
}

export async function signup(input: SignupInput) {
  const response = await apiClient.post<ApiResponse<{ user: AuthUser }>>('/auth/signup', input);
  return response.data.data.user;
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

const authErrorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  EMAIL_ALREADY_IN_USE: '이미 가입된 이메일입니다.',
  VALIDATION_ERROR: '입력한 내용을 다시 확인해 주세요.',
  AUTH_NOT_CONFIGURED: '로그인 서버 설정이 완료되지 않았습니다.',
};

export function getAuthErrorMessage(error: unknown) {
  if (isAxiosError<{ error?: { code?: string } }>(error)) {
    const code = error.response?.data?.error?.code;
    if (code && authErrorMessages[code]) {
      return authErrorMessages[code];
    }
    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }

  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
