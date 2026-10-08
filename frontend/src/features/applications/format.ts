import { isAxiosError } from 'axios';
import type { ApplicationStatus } from '@/features/applications/types';

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  PENDING: '검토 중',
  ACCEPTED: '수락됨',
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
