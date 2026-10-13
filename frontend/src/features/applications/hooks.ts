import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as applicationApi from '@/features/applications/api';
import type {
  ApplicationDecision,
  CreateApplicationInput,
  PriceOfferDecision,
} from '@/features/applications/types';

export const applicationKeys = {
  all: ['applications'] as const,
  byProject: (projectId: string) => ['applications', 'project', projectId] as const,
  mine: () => ['applications', 'me'] as const,
  detail: (applicationId: string) => ['applications', 'detail', applicationId] as const,
};

export function useApplication(applicationId: string, enabled = true) {
  return useQuery({
    queryKey: applicationKeys.detail(applicationId),
    queryFn: () => applicationApi.getApplication(applicationId),
    enabled,
  });
}

export function useOfferPrice(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => applicationApi.offerPrice(applicationId, amount),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

export function useRespondToPriceOffer(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: PriceOfferDecision) =>
      applicationApi.respondToPriceOffer(applicationId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

export function useDecideApplication(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { applicationId: string; status: ApplicationDecision }) =>
      applicationApi.decideApplication(params.applicationId, params.status),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: applicationKeys.byProject(projectId) }),
  });
}
