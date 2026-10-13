import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export type ProfileCategory = 'Web Development' | 'Design' | 'Marketing' | 'Other';

export interface ClientProfile {
  role: 'CLIENT';
  companyName: string;
  industry: string;
  websiteUrl: string | null;
}

export interface FreelancerProfile {
  role: 'FREELANCER';
  mainCategory: string;
  careerYears: number;
  desiredRate: number;
  portfolioUrl: string | null;
  skills: string[];
}

export interface MyProfile {
  id: string;
  email: string;
  role: 'CLIENT' | 'FREELANCER' | null;
  name: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  profile: ClientProfile | FreelancerProfile | null;
}

interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface CommonProfileInput {
  name?: string;
  bio?: string | null;
  profileImageUrl?: string | null;
}

export interface ClientProfileInput {
  companyName: string;
  industry: string;
  websiteUrl?: string | null;
}

export interface FreelancerProfileInput {
  mainCategory: ProfileCategory;
  careerYears: number;
  desiredRate: number;
  portfolioUrl?: string | null;
  skills: string[];
}

const profileKey = ['profile', 'me'] as const;

async function fetchMyProfile() {
  const response = await apiClient.get<ApiResponse<MyProfile>>('/users/me');
  return response.data.data;
}

function syncAuthUser(profile: MyProfile) {
  const { accessToken, setSession } = useAuthStore.getState();
  if (!accessToken) {
    return;
  }

  setSession(accessToken, {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
  });
}

export function useMyProfile() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: profileKey,
    queryFn: fetchMyProfile,
    enabled: Boolean(user),
  });
}

export function useUpdateCommonProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CommonProfileInput) => {
      const response = await apiClient.patch<ApiResponse<MyProfile>>('/users/me', input);
      return response.data.data;
    },
    onSuccess: (profile) => {
      syncAuthUser(profile);
      queryClient.setQueryData(profileKey, profile);
    },
  });
}

export function useUpdateClientProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClientProfileInput) => {
      const response = await apiClient.put<ApiResponse<MyProfile>>(
        '/users/me/client-profile',
        input,
      );
      return response.data.data;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey, profile);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateFreelancerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: FreelancerProfileInput) => {
      const response = await apiClient.put<ApiResponse<MyProfile>>(
        '/users/me/freelancer-profile',
        input,
      );
      return response.data.data;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey, profile);
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function getProfileErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === 'string') {
      return message;
    }

    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }

  return '프로필을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
