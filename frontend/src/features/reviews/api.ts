import type {
  ContractReviews,
  CreateReviewInput,
  Review,
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
