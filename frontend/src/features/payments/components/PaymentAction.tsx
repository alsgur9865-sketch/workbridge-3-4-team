import { isAxiosError } from 'axios';
import { CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatWon, getApplicationErrorMessage } from '@/features/applications/format';
import type { Contract } from '@/features/contracts/types';
import { usePreparePayment } from '@/features/payments/hooks';
import { openTossPaymentWindow } from '@/lib/toss-payments-sdk';
import type { AuthUser } from '@/stores/auth.store';

export function PaymentAction({
  contract,
  user,
  isClient,
}: {
  contract: Contract;
  user: AuthUser;
  isClient: boolean;
}) {
  const prepareMutation = usePreparePayment();
  const [windowOpen, setWindowOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isClient) {
    return (
      <p className="mt-6 rounded-2xl bg-white px-5 py-4 text-sm text-slate-600 shadow-[0_16px_45px_rgba(15,23,42,0.06)] ring-1 ring-black/5">
        의뢰인의 결제를 기다리고 있습니다.
      </p>
    );
  }

  async function startPayment() {
    setLocalError(null);

    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
    if (!clientKey) {
      setLocalError('토스페이먼츠 클라이언트 키가 설정되지 않았습니다.');
      return;
    }

    try {
      const payment = await prepareMutation.mutateAsync(contract.id);
      setWindowOpen(true);

      await openTossPaymentWindow({
        clientKey,
        customerKey: user.id,
        orderId: payment.orderId,
        orderName: payment.orderName,
        amount: payment.amount,
        contractId: contract.id,
        customerEmail: user.email,
        customerName: user.name,
      });
    } catch (error) {
      setLocalError(
        isAxiosError(error)
          ? getApplicationErrorMessage(error)
          : error instanceof Error
            ? error.message
            : '결제창을 열지 못했습니다.',
      );
    } finally {
      setWindowOpen(false);
    }
  }

  const errorMessage =
    localError ??
    (prepareMutation.isError ? getApplicationErrorMessage(prepareMutation.error) : null);

  return (
    <div className="mt-6 rounded-[2rem] bg-gradient-to-br from-[#1d1d1f] to-[#303033] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)] sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-bold">계약금 결제</p>
          <p className="mt-1 text-sm text-[#d2d2d7]">
            계약 금액 {formatWon(contract.agreedAmount)}을 토스페이먼츠 테스트 결제로 진행합니다.
          </p>
        </div>
        <Button
          className="gap-1.5 rounded-full bg-white px-5 font-bold text-[#1d1d1f] hover:bg-[#f5f5f7]"
          disabled={prepareMutation.isPending || windowOpen}
          onClick={() => void startPayment()}
        >
          <CreditCard className="size-4" aria-hidden="true" />
          {prepareMutation.isPending
            ? '결제 준비 중...'
            : windowOpen
              ? '결제창 진행 중...'
              : '결제하기'}
        </Button>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
