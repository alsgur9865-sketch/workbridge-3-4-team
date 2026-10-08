import axios, { AxiosHeaders, isAxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore, type AuthUser } from '@/stores/auth.store';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface SessionData {
  accessToken: string;
  user: AuthUser;
}

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string> | null = null;
let initialRestorePromise: Promise<boolean> | null = null;

async function requestNewAccessToken() {
  const response = await refreshClient.post<ApiResponse<SessionData>>('/auth/refresh');
  const { accessToken, user } = response.data.data;

  useAuthStore.getState().setSession(accessToken, user);
  return accessToken;
}

function getRefreshPromise() {
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function shouldSkipAutomaticRefresh(url?: string) {
  return Boolean(url?.startsWith('/auth/'));
}

export function restoreSession() {
  if (!initialRestorePromise) {
    initialRestorePromise = getRefreshPromise()
      .then(() => true)
      .catch(() => {
        useAuthStore.getState().clearSession();
        return false;
      });
  }

  return initialRestorePromise;
}

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!isAxiosError(error) || error.response?.status !== 401 || !error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryRequestConfig;
    if (originalRequest._retry || shouldSkipAutomaticRefresh(originalRequest.url)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const accessToken = await getRefreshPromise();
      const headers = AxiosHeaders.from(originalRequest.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);
      originalRequest.headers = headers;

      return apiClient.request(originalRequest);
    } catch {
      useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }
  },
);
