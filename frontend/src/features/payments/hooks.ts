import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contractKeys } from '@/features/contracts/hooks';
import * as paymentApi from '@/features/payments/api';
import type { ConfirmPaymentInput } from '@/features/payments/types';

export function usePreparePayment() {
  return useMutation({
    mutationFn: (contractId: string) => paymentApi.preparePayment(contractId),
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConfirmPaymentInput) => paymentApi.confirmPayment(input),
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: contractKeys.detail(payment.contractId) });
    },
  });
}
