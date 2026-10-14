import { isAxiosError } from 'axios';
import { apiClient } from '@/lib/api-client';

export interface Delivery {
  id: string;
  contractId: string;
  message: string;
  resultUrl: string | null;
  attachmentUrls: string[] | null;
  status: 'SUBMITTED' | 'APPROVED';
  submittedAt: string;
  approvedAt: string | null;
}

export interface DeliveryPageData {
  contractId: string;
  projectId: string;
  projectTitle: string;
  clientId: string;
  freelancerId: string;
  projectTransactionStatus: string;
  delivery: Delivery | null;
  canSubmit: boolean;
  canApprove: boolean;
  settlementAvailable: boolean;
  storageConfigured: boolean;
  uploadPolicy: { maxFiles: number; maxBytes: number; extensions: string[] };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}
export interface SubmitDeliveryInput {
  message: string;
  resultUrl: string | null;
  attachmentUrls: string[];
}

export async function getDelivery(contractId: string) {
  const response = await apiClient.get<ApiResponse<DeliveryPageData>>(
    `/contracts/${contractId}/delivery`,
  );
  return response.data.data;
}

export async function submitDelivery(contractId: string, input: SubmitDeliveryInput) {
  const response = await apiClient.post<ApiResponse<Delivery>>(
    `/contracts/${contractId}/delivery`,
    input,
  );
  return response.data.data;
}

export async function uploadAttachment(contractId: string, file: File) {
  const response = await apiClient.post<ApiResponse<{ path: string; signedUrl: string }>>(
    `/contracts/${contractId}/delivery/upload-url`,
    { filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size },
  );
  const { path, signedUrl } = response.data.data;
  const body = new FormData();
  body.append('cacheControl', '0');
  body.append('', file);
  const uploaded = await fetch(signedUrl, {
    method: 'PUT',
    body,
    credentials: 'omit',
    headers: { 'x-upsert': 'false' },
    signal: AbortSignal.timeout(120_000),
  });
  if (!uploaded.ok)
    throw new Error('파일 업로드에 실패했습니다. 파일 크기와 형식을 확인하고 다시 시도해 주세요.');
  return path;
}

export async function downloadAttachment(contractId: string, path: string) {
  const response = await apiClient.post<ApiResponse<{ signedUrl: string }>>(
    `/contracts/${contractId}/delivery/download-url`,
    { path },
  );
  return response.data.data.signedUrl;
}

export async function approveDelivery(deliveryId: string) {
  const response = await apiClient.patch<ApiResponse<Delivery>>(
    `/deliveries/${deliveryId}/approve`,
  );
  return response.data.data;
}

export function deliveryError(error: unknown) {
  const messages: Record<string, string> = {
    UNAUTHORIZED: '다시 로그인해 주세요.',
    FORBIDDEN: '이 작업을 수행할 권한이 없습니다.',
    NOT_CONTRACT_PARTY: '이 계약의 의뢰인과 프리랜서만 결과물을 볼 수 있습니다.',
    CONTRACT_NOT_FOUND: '계약을 찾을 수 없습니다.',
    DELIVERY_STAGE_CLOSED: '계약 서명과 결제가 완료된 작업 중 프로젝트에서만 진행할 수 있습니다.',
    ALREADY_DELIVERED: '이미 최종 결과물이 제출되었습니다. 화면을 새로고침해 주세요.',
    ALREADY_APPROVED: '이미 승인된 결과물입니다. 화면을 새로고침해 주세요.',
    STORAGE_NOT_CONFIGURED:
      '파일 저장소가 아직 연결되지 않았습니다. 설명과 링크는 제출할 수 있습니다.',
    STORAGE_NOT_PRIVATE: '비공개 파일 저장소 설정을 관리자에게 요청해 주세요.',
    STORAGE_LIMITS_REQUIRED: '파일 저장소의 업로드 용량 제한 설정이 필요합니다.',
    STORAGE_UNAVAILABLE: '파일 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    ATTACHMENT_NOT_UPLOADED: '업로드되지 않은 파일이 있습니다. 다시 첨부해 주세요.',
    INVALID_ATTACHMENT: '파일 크기 또는 형식이 허용 범위를 벗어났습니다.',
    INVALID_ATTACHMENT_PATH: '이 계약에 업로드한 파일만 첨부할 수 있습니다.',
    ATTACHMENT_NOT_FOUND: '제출된 첨부파일을 찾을 수 없습니다.',
    SETTLEMENT_NOT_READY:
      '정산 기능 연결 전에는 승인할 수 없습니다. 제출된 결과물은 안전하게 보관됩니다.',
    VALIDATION_ERROR:
      '입력 내용을 확인해 주세요. 설명은 10~5,000자, 링크는 http 또는 https 주소여야 합니다.',
  };
  if (isAxiosError(error))
    return (
      messages[error.response?.data?.error?.code] ??
      '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.'
    );
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
}
