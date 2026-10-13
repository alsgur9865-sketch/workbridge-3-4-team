import type { ContractStatus } from '@/features/contracts/types';
import { cn } from '@/lib/utils';

const statusLabels: Record<ContractStatus, string> = {
  DRAFT: '서명 대기',
  PARTIALLY_SIGNED: '한쪽 서명 완료',
  SIGNED: '계약 체결',
  CANCELLED: '취소됨',
};

const statusStyles: Record<ContractStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-200',
  PARTIALLY_SIGNED: 'bg-amber-50 text-amber-700 ring-amber-200',
  SIGNED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset',
        statusStyles[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
