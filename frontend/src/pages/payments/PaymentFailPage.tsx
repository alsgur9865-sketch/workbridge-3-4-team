import { CircleX } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { WorkflowPageFrame } from '@/components/WorkflowPageFrame';

export function PaymentFailPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const message = searchParams.get('message') ?? '';
  const contractId = searchParams.get('contractId') ?? '';

  return (
    <WorkflowPageFrame size="compact" className="flex items-center">
      <div className="w-full rounded-[2rem] border border-rose-100 bg-white p-8 text-center shadow-[0_28px_80px_rgba(15,23,42,0.1)] sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-rose-50">
          <CircleX className="size-9 text-rose-600" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-[-0.03em]">결제가 완료되지 않았습니다</h1>
        <p className="mt-3 text-sm text-slate-600">
          {message || '결제가 취소되었거나 인증 과정에서 오류가 발생했습니다.'}
        </p>
        {code ? <p className="mt-2 text-xs text-slate-400">오류 코드: {code}</p> : null}

        <Link
          className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[#0071e3] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0077ed]"
          to={contractId ? `/contracts/${contractId}` : '/'}
        >
          계약서로 돌아가기
        </Link>
      </div>
    </WorkflowPageFrame>
  );
}
