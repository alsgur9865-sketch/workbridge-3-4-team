import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as applicationApi from '@/features/applications/api';
import type { ApplicationDecision, CreateApplicationInput } from '@/features/applications/types';

export const applicationKeys = {
  all: ['applications'] as const,
  byProject: (projectId: string) => ['applications', 'project', projectId] as const,
  mine: () => ['applications', 'me'] as const,
};

export function useProjectApplications(projectId: string, enabled = true) {
  return useQuery({
    queryKey: applicationKeys.byProject(projectId),
    queryFn: () => applicationApi.getProjectApplications(projectId),
    enabled,
  });
}

export function useMyApplications(enabled = true) {
  return useQuery({
    queryKey: applicationKeys.mine(),
    queryFn: applicationApi.getMyApplications,
    enabled,
  });
}

export function useApplyToProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateApplicationInput) => applicationApi.applyToProject(projectId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
  });
}

export function useDecideApplication(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { applicationId: string; status: ApplicationDecision }) =>
      applicationApi.decideApplication(params.applicationId, params.status),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.byProject(projectId) }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]),
  });
}
