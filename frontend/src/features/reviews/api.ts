import { useQuery } from '@tanstack/react-query';
import type {
  ContractReviews,
  CreateReviewInput,
  Review,
  ReviewHighlights,
  UserReviews,
} from '@/features/reviews/types';
import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function getContractReviews(contractId: string) {
  const response = await apiClient.get<ApiResponse<ContractReviews>>(
    `/contracts/${contractId}/reviews`,
  );
  return response.data.data;
}

export async function createReview(contractId: string, input: CreateReviewInput) {
  const response = await apiClient.post<ApiResponse<Review>>(
    `/contracts/${contractId}/reviews`,
    input,
  );
  return response.data.data;
}

export async function getUserReviews(userId: string) {
  const response = await apiClient.get<ApiResponse<UserReviews>>(`/users/${userId}/reviews`);
  return response.data.data;
}

export async function getReviewHighlights() {
  const response = await apiClient.get<ApiResponse<ReviewHighlights>>('/reviews/highlights');
  return response.data.data;
}

export function useReviewHighlights() {
  return useQuery({
    queryKey: ['reviews', 'highlights'],
    queryFn: getReviewHighlights,
    staleTime: 60_000,
  });
}
