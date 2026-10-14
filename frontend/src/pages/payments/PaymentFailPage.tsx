import { CircleX } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export function PaymentFailPage() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') ?? '';
  const message = searchParams.get('message') ?? '';
  const contractId = searchParams.get('contractId') ?? '';

  return (
    <section className="mx-auto max-w-xl px-5 py-20">
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <CircleX className="mx-auto size-11 text-rose-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold">결제가 완료되지 않았습니다</h1>
        <p className="mt-3 text-sm text-slate-600">
          {message || '결제가 취소되었거나 인증 과정에서 오류가 발생했습니다.'}
        </p>
        {code ? <p className="mt-2 text-xs text-slate-400">오류 코드: {code}</p> : null}

        <Link
          className="mt-7 inline-flex h-10 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700"
          to={contractId ? `/contracts/${contractId}` : '/'}
        >
          계약서로 돌아가기
        </Link>
      </div>
    </section>
  );
}
