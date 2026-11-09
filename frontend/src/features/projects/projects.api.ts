import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export type ProjectRecruitmentStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED';

export interface Project {
  id: string;
  clientId: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  workStartAt: string;
  workEndAt: string;
  recruitmentStartAt: string | null;
  recruitmentDeadline: string;
  recruitmentStatus: ProjectRecruitmentStatus;
  transactionStatus: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string | null;
    companyName: string | null;
  };
  skills: string[];
  isBookmarked: boolean;
  myApplication?: { id: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' } | null;
  recommendation?: { matchedSkills: string[]; categoryMatched: boolean; score: number };
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: ProjectRecruitmentStatus;
  skill?: string;
  minBudget?: number;
  maxBudget?: number;
  sort?: 'newest' | 'budgetLow' | 'budgetHigh' | 'deadline';
  bookmarkedOnly?: boolean;
}

export interface ProjectInput {
  title: string;
  description: string;
  category: string;
  budget: number;
  workStartAt: string;
  workEndAt: string;
  recruitmentStartAt?: string;
  recruitmentDeadline: string;
  skills: string[];
}

export interface PriceEstimateInput {
  title: string;
  description: string;
  category: string;
  estimatedDays: number;
  skills: string[];
}

export interface PriceEstimateResult {
  estimatedMinAmount: number;
  estimatedMaxAmount: number;
  estimatedTotalAmount: number;
  currency: 'KRW';
  summary: string;
  factors: Array<{
    label: string;
    impact: 'increase' | 'decrease' | 'neutral';
    reason: string;
  }>;
  assumptions: string[];
}

interface ProjectListResponse {
  success: true;
  data: Project[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ProjectResponse {
  success: true;
  data: Project;
}

const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: ProjectFilters, userId: string | null) =>
    [...projectKeys.lists(), userId, filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (projectId: string, userId?: string | null) =>
    [...projectKeys.details(), projectId, userId] as const,
};

export async function fetchProjects(filters: ProjectFilters = {}) {
  const response = await apiClient.get<ProjectListResponse>('/projects', {
    params: filters,
  });
  return response.data;
}

export async function fetchProject(projectId: string) {
  const response = await apiClient.get<ProjectResponse>(`/projects/${projectId}`);
  return response.data.data;
}

export function useProjects(filters: ProjectFilters = {}) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  return useQuery({
    queryKey: projectKeys.list(filters, userId),
    queryFn: () => fetchProjects(filters),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === userId ? keepPreviousData(previousData) : undefined,
    refetchInterval: 30_000,
  });
}

export function useProject(projectId: string, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id ?? null);
  return useQuery({
    queryKey: projectKeys.detail(projectId, userId),
    queryFn: () => fetchProject(projectId),
    enabled: Boolean(projectId) && enabled,
    refetchInterval: 30_000,
  });
}

export function useRecommendedProjects() {
  const user = useAuthStore((state) => state.user);
  return useQuery({
    queryKey: [...projectKeys.all, 'recommended', user?.id ?? null],
    queryFn: async () => {
      const response = await apiClient.get<{
        data: Project[];
        meta: { profileRequired: boolean };
      }>('/projects/recommended');
      return response.data;
    },
    enabled: user?.role === 'FREELANCER',
    refetchInterval: 30_000,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const response = await apiClient.post<ProjectResponse>('/projects', input);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const response = await apiClient.patch<ProjectResponse>(`/projects/${projectId}`, input);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      await apiClient.delete(`/projects/${projectId}`);
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.removeQueries({ queryKey: [...projectKeys.details(), projectId] });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useToggleBookmark(projectId: string, isBookmarked: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        await apiClient.delete(`/projects/${projectId}/bookmark`);
        return false;
      }

      await apiClient.post(`/projects/${projectId}/bookmark`, {});
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function usePriceEstimate() {
  return useMutation({
    mutationFn: async (input: PriceEstimateInput) => {
      const response = await apiClient.post<{ success: true; data: PriceEstimateResult }>(
        '/projects/price-estimate',
        input,
        {
          timeout: 30_000,
        },
      );
      return response.data.data;
    },
  });
}

export function getProjectErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return '로그인이 필요한 기능입니다.';
    }
    const message = error.response?.data?.error?.message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
