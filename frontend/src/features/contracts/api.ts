import type { Contract, CreateContractInput } from '@/features/contracts/types';
import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function createContract(input: CreateContractInput) {
  const response = await apiClient.post<ApiResponse<Contract>>('/contracts', input);
  return response.data.data;
}

export async function getContract(contractId: string) {
  const response = await apiClient.get<ApiResponse<Contract>>(`/contracts/${contractId}`);
  return response.data.data;
}

export async function signContract(contractId: string) {
  const response = await apiClient.post<ApiResponse<Contract>>(`/contracts/${contractId}/sign`);
  return response.data.data;
}
