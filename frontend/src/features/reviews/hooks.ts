import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as reviewApi from '@/features/reviews/api';
import type { CreateReviewInput } from '@/features/reviews/types';

export const reviewKeys = {
  all: ['reviews'] as const,
  contract: (contractId: string) => ['reviews', 'contract', contractId] as const,
  user: (userId: string) => ['reviews', 'user', userId] as const,
};

export function useContractReviews(contractId: string, enabled = true) {
  return useQuery({
    queryKey: reviewKeys.contract(contractId),
    queryFn: () => reviewApi.getContractReviews(contractId),
    enabled,
  });
}

export function useUserReviews(userId: string, enabled = true) {
  return useQuery({
    queryKey: reviewKeys.user(userId),
    queryFn: () => reviewApi.getUserReviews(userId),
    enabled,
  });
}

export function useCreateReview(contractId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReviewInput) => reviewApi.createReview(contractId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}
