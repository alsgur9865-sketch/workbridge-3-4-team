import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WorkflowPageFrame } from '@/components/WorkflowPageFrame';
import { formatWon, getApplicationErrorMessage } from '@/features/applications/format';
import { useConfirmPayment } from '@/features/payments/hooks';

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const confirmMutation = useConfirmPayment();
  const started = useRef(false);

  const paymentKey = searchParams.get('paymentKey') ?? '';
  const orderId = searchParams.get('orderId') ?? '';
  const amount = Number(searchParams.get('amount'));
  const contractIdFromUrl = searchParams.get('contractId') ?? '';
  const valid =
    Boolean(paymentKey) && Boolean(orderId) && Number.isSafeInteger(amount) && amount > 0;

  useEffect(() => {
    if (!valid || started.current) {
      return;
    }

    started.current = true;
    confirmMutation.mutate({ paymentKey, orderId, amount });
  }, [amount, confirmMutation, orderId, paymentKey, valid]);

  if (!valid) {
    return (
      <PaymentResultCard
        title="결제 정보를 확인할 수 없습니다"
        description="결제 결과 주소의 정보가 올바르지 않습니다. 계약서에서 다시 시도해 주세요."
        contractId={contractIdFromUrl}
        success={false}
      />
    );
  }

  if (confirmMutation.isPending || !started.current) {
    return <PaymentLoading />;
  }

  if (confirmMutation.isError) {
    return (
      <PaymentResultCard
        title="결제 승인을 완료하지 못했습니다"
        description={getApplicationErrorMessage(confirmMutation.error)}
        contractId={contractIdFromUrl}
        success={false}
      />
    );
  }

  const payment = confirmMutation.data;
  if (!payment) {
    return <PaymentLoading />;
  }

  return (
    <WorkflowPageFrame size="compact" className="flex items-center">
      <div className="w-full rounded-[2rem] border border-emerald-100 bg-white p-8 text-center shadow-[0_28px_80px_rgba(15,23,42,0.1)] sm:p-10">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="size-9 text-emerald-600" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-[-0.03em]">결제가 완료되었습니다</h1>
        <p className="mt-2 text-sm text-slate-600">
          결제 금액은 작업 완료 승인 전까지 WorkBridge 결제 상태에서 보관됩니다.
        </p>

        <dl className="mt-7 grid gap-3 rounded-2xl bg-[#f5f5f7] p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">결제 금액</dt>
            <dd className="font-bold">{formatWon(payment.amount)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">플랫폼 수수료</dt>
            <dd className="font-bold">
              {payment.platformFee === null ? '-' : formatWon(payment.platformFee)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">프리랜서 정산 예정액</dt>
            <dd className="font-bold">
              {payment.settlementAmount === null ? '-' : formatWon(payment.settlementAmount)}
            </dd>
          </div>
        </dl>

        <Link
          className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[#0071e3] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0077ed]"
          to={`/contracts/${payment.contractId}`}
        >
          계약서로 돌아가기
        </Link>
      </div>
    </WorkflowPageFrame>
  );
}

function PaymentLoading() {
  return (
    <WorkflowPageFrame size="compact" className="flex items-center text-center">
      <div className="w-full rounded-[2rem] border border-black/5 bg-white p-10 shadow-[0_28px_80px_rgba(15,23,42,0.1)]">
        <LoaderCircle className="mx-auto size-10 animate-spin text-[#0071e3]" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-black tracking-[-0.03em]">결제를 확인하고 있습니다</h1>
        <p className="mt-2 text-sm text-slate-500">창을 닫지 말고 잠시 기다려 주세요.</p>
      </div>
    </WorkflowPageFrame>
  );
}

function PaymentResultCard({
  title,
  description,
  contractId,
  success,
}: {
  title: string;
  description: string;
  contractId: string;
  success: boolean;
}) {
  return (
    <WorkflowPageFrame size="compact" className="flex items-center">
      <div className="w-full rounded-[2rem] border border-black/5 bg-white p-8 text-center shadow-[0_28px_80px_rgba(15,23,42,0.1)] sm:p-10">
        <h1 className="text-3xl font-black tracking-[-0.03em]">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">{description}</p>
        <Link
          className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[#0071e3] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#0077ed]"
          to={contractId ? `/contracts/${contractId}` : '/'}
        >
          {success ? '계약서로 돌아가기' : '돌아가기'}
        </Link>
      </div>
    </WorkflowPageFrame>
  );
}
