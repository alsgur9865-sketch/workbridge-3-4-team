import { apiClient } from '@/lib/api-client';
import type {
  Application,
  ApplicationDecision,
  ApplicationDetail,
  CreateApplicationInput,
  MyApplication,
  PriceOfferDecision,
  ProjectApplication,
} from '@/features/applications/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function applyToProject(projectId: string, input: CreateApplicationInput) {
  const response = await apiClient.post<ApiResponse<Application>>(
    `/projects/${projectId}/applications`,
    input,
  );
  return response.data.data;
}

export async function getProjectApplications(projectId: string) {
  const response = await apiClient.get<ApiResponse<ProjectApplication[]>>(
    `/projects/${projectId}/applications`,
  );
  return response.data.data;
}

export async function getMyApplications() {
  const response = await apiClient.get<ApiResponse<MyApplication[]>>('/applications/me');
  return response.data.data;
}

export async function decideApplication(applicationId: string, status: ApplicationDecision) {
  const response = await apiClient.patch<ApiResponse<Application>>(
    `/applications/${applicationId}/status`,
    { status },
  );
  return response.data.data;
}

export async function getApplication(applicationId: string) {
  const response = await apiClient.get<ApiResponse<ApplicationDetail>>(
    `/applications/${applicationId}`,
  );
  return response.data.data;
}

export async function offerPrice(applicationId: string, amount: number) {
  const response = await apiClient.post<ApiResponse<Application>>(
    `/applications/${applicationId}/price-offer`,
    { amount },
  );
  return response.data.data;
}

export async function respondToPriceOffer(applicationId: string, status: PriceOfferDecision) {
  const response = await apiClient.patch<ApiResponse<Application>>(
    `/applications/${applicationId}/price-offer`,
    { status },
  );
  return response.data.data;
}
