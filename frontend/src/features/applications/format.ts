import { isAxiosError } from 'axios';
import type { ApplicationStatus, PriceOfferStatus } from '@/features/applications/types';

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  PENDING: '검토 중',
  ACCEPTED: '수락됨',
  REJECTED: '거절됨',
};

export const priceOfferStatusLabels: Record<PriceOfferStatus, string> = {
  NONE: '제안 전',
  PENDING: '응답 대기',
  ACCEPTED: '금액 확정',
  REJECTED: '거절됨',
};

const errorMessages: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  INVALID_TOKEN: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  FORBIDDEN: '이 작업을 할 수 있는 권한이 없습니다.',
  PROJECT_NOT_FOUND: '프로젝트를 찾을 수 없습니다.',
  APPLICATION_NOT_FOUND: '지원서를 찾을 수 없습니다.',
  CANNOT_APPLY_OWN_PROJECT: '내가 등록한 프로젝트에는 지원할 수 없습니다.',
  RECRUITMENT_CLOSED: '모집이 마감된 프로젝트입니다.',
  ALREADY_APPLIED: '이미 지원한 프로젝트입니다.',
  NOT_PROJECT_OWNER: '프로젝트 등록자만 지원자를 관리할 수 있습니다.',
  APPLICATION_ALREADY_PROCESSED: '이미 처리된 지원서입니다.',
  APPLICANT_ALREADY_SELECTED: '이미 다른 지원자가 선정되었습니다.',
  NOT_APPLICATION_PARTICIPANT: '이 지원서를 볼 수 있는 권한이 없습니다.',
  NOT_APPLICANT: '지원자 본인만 응답할 수 있습니다.',
  APPLICATION_NOT_SELECTED: '선정된 지원자에게만 금액을 제안할 수 있습니다.',
  PRICE_AGREEMENT_CLOSED: '금액 협의 단계가 아닙니다.',
  PRICE_OFFER_PENDING: '프리랜서의 응답을 기다리는 중입니다.',
  PRICE_ALREADY_AGREED: '이미 금액이 확정되었습니다.',
  PRICE_OFFER_NOT_AVAILABLE: '지금은 금액을 제안할 수 없습니다.',
  NO_PENDING_PRICE_OFFER: '응답할 금액 제안이 없습니다.',
  CONTRACT_NOT_FOUND: '계약서를 찾을 수 없습니다.',
  NOT_CONTRACT_PARTY: '계약 당사자만 볼 수 있는 계약서입니다.',
  CONTRACT_ALREADY_EXISTS: '이미 계약서가 작성되었습니다.',
  PRICE_NOT_AGREED: '금액이 확정된 뒤에 계약서를 작성할 수 있습니다.',
  CONTRACT_STAGE_CLOSED: '지금은 계약서를 작성할 수 있는 단계가 아닙니다.',
  INVALID_CONTRACT_PERIOD: '계약 종료일은 시작일보다 뒤여야 합니다.',
  ALREADY_SIGNED: '이미 서명한 계약서입니다.',
  CONTRACT_NOT_SIGNABLE: '더 이상 서명할 수 없는 계약서입니다.',
  VALIDATION_ERROR: '입력값을 다시 확인해 주세요.',
};

export function getApplicationErrorMessage(error: unknown) {
  if (isAxiosError<{ error?: { code?: string } }>(error)) {
    const code = error.response?.data?.error?.code;
    if (code && errorMessages[code]) {
      return errorMessages[code];
    }
    if (!error.response) {
      return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    }
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

const wonFormatter = new Intl.NumberFormat('ko-KR');

export function formatWon(amount: number) {
  return `${wonFormatter.format(amount)}원`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));
}
