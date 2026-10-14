import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationKeys } from '@/features/applications/hooks';
import * as contractApi from '@/features/contracts/api';
import type { CreateContractInput } from '@/features/contracts/types';

export const contractKeys = {
  detail: (contractId: string) => ['contracts', contractId] as const,
};

export function useContract(contractId: string, enabled = true) {
  return useQuery({
    queryKey: contractKeys.detail(contractId),
    queryFn: () => contractApi.getContract(contractId),
    enabled,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContractInput) => contractApi.createContract(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

export function useSignContract(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => contractApi.signContract(contractId),
    onSuccess: (contract) => {
      queryClient.setQueryData(contractKeys.detail(contractId), contract);
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}
