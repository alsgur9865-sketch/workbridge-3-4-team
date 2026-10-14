import { apiClient } from '@/lib/api-client';
import type { ConfirmPaymentInput, Payment } from '@/features/payments/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export async function preparePayment(contractId: string) {
  const response = await apiClient.post<ApiResponse<Payment>>(`/contracts/${contractId}/payment`);
  return response.data.data;
}

export async function confirmPayment(input: ConfirmPaymentInput) {
  const response = await apiClient.post<ApiResponse<Payment>>('/payments/confirm', input);
  return response.data.data;
}

export async function getPayment(paymentId: string) {
  const response = await apiClient.get<ApiResponse<Payment>>(`/payments/${paymentId}`);
  return response.data.data;
}
