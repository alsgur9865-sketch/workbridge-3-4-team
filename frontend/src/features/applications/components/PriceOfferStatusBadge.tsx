import { priceOfferStatusLabels } from '@/features/applications/format';
import type { PriceOfferStatus } from '@/features/applications/types';
import { cn } from '@/lib/utils';

const statusStyles: Record<PriceOfferStatus, string> = {
  NONE: 'bg-slate-100 text-slate-600 ring-slate-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function PriceOfferStatusBadge({ status }: { status: PriceOfferStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset',
        statusStyles[status],
      )}
    >
      {priceOfferStatusLabels[status]}
    </span>
  );
}
