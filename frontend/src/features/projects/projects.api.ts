import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/api-client';

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
  list: (filters: ProjectFilters) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (projectId: string) => [...projectKeys.details(), projectId] as const,
};

const developmentClientHeaders = import.meta.env.DEV
  ? { 'X-WorkBridge-Demo-User': 'client@workbridge.test' }
  : undefined;

const developmentViewerHeaders = import.meta.env.DEV
  ? { 'X-WorkBridge-Demo-User': 'freelancer2@workbridge.test' }
  : undefined;

export async function fetchProjects(filters: ProjectFilters = {}) {
  const response = await apiClient.get<ProjectListResponse>('/projects', {
    params: filters,
    headers: developmentViewerHeaders,
  });
  return response.data;
}

export async function fetchProject(projectId: string) {
  const response = await apiClient.get<ProjectResponse>(`/projects/${projectId}`, {
    headers: developmentViewerHeaders,
  });
  return response.data.data;
}

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => fetchProjects(filters),
    placeholderData: keepPreviousData,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => fetchProject(projectId),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const response = await apiClient.post<ProjectResponse>('/projects', input, {
        headers: developmentClientHeaders,
      });
      return response.data.data;
    },
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const response = await apiClient.patch<ProjectResponse>(`/projects/${projectId}`, input, {
        headers: developmentClientHeaders,
      });
      return response.data.data;
    },
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      await apiClient.delete(`/projects/${projectId}`, { headers: developmentClientHeaders });
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useToggleBookmark(projectId: string, isBookmarked: boolean) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        await apiClient.delete(`/projects/${projectId}/bookmark`, {
          headers: developmentViewerHeaders,
        });
        return false;
      }

      await apiClient.post(
        `/projects/${projectId}/bookmark`,
        {},
        { headers: developmentViewerHeaders },
      );
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function usePriceEstimate() {
  return useMutation({
    mutationFn: async (input: PriceEstimateInput) => {
      const response = await apiClient.post<{ success: true; data: PriceEstimateResult }>(
        '/projects/price-estimate',
        input,
        { headers: developmentClientHeaders },
      );
      return response.data.data;
    },
  });
}

export function getProjectErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === 'string') {
      return message;
    }
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
