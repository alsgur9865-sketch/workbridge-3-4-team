import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface HealthResponse {
  success: boolean;
  service: string;
  version: string;
  timestamp: string;
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiClient.get<HealthResponse>('/health');
      return response.data;
    },
    retry: false,
  });
}
