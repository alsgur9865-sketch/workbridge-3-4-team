import { useState } from 'react';
import { CheckCircle2, Circle, PartyPopper, PenLine, Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AccessNotice } from '@/features/applications/components/AccessNotice';
import { formatDate, formatWon, getApplicationErrorMessage } from '@/features/applications/format';
import { ContractStatusBadge } from '@/features/contracts/components/ContractStatusBadge';
import { useContract, useSignContract } from '@/features/contracts/hooks';
import type { Contract } from '@/features/contracts/types';
import { PaymentAction } from '@/features/payments/components/PaymentAction';
import { useAuthStore } from '@/stores/auth.store';

const dateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function ContractDetailPage() {
  const { contractId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const contractQuery = useContract(contractId, Boolean(user));

  if (!user) {
    return (
      <AccessNotice
        title="로그인이 필요합니다"
        description="계약서를 보려면 로그인해 주세요."
        showLoginLink
      />
    );
  }

  if (contractQuery.isPending) {
    return (
      <p className="mx-auto max-w-3xl px-5 py-24 text-center text-slate-500">불러오는 중...</p>
    );
  }

  if (contractQuery.isError) {
    return (
      <AccessNotice
        title="계약서를 볼 수 없습니다"
        description={getApplicationErrorMessage(contractQuery.error)}
      />
    );
  }

  return <ContractDocument contract={contractQuery.data} user={user} />;
}

function ContractDocument({
  contract,
  user,
}: {
  contract: Contract;
  user: { id: string; email: string; name: string | null; role: 'CLIENT' | 'FREELANCER' | null };
}) {
  const signMutation = useSignContract(contract.id);
  const [agreed, setAgreed] = useState(false);
  const isClient = contract.clientId === user.id;
  const mySignedAt = isClient ? contract.clientSignedAt : contract.freelancerSignedAt;
  const canSign = !mySignedAt && contract.status !== 'SIGNED' && contract.status !== 'CANCELLED';
  const content = contract.content;

  const parties = [
    { label: '의뢰인 (갑)', name: content?.clientName ?? '-', signedAt: contract.clientSignedAt },
    {
      label: '프리랜서 (을)',
      name: content?.freelancerName ?? '-',
      signedAt: contract.freelancerSignedAt,
    },
  ];

  return (
    <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-brand-600">프로젝트 용역 계약서</p>
        <ContractStatusBadge status={contract.status} />
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{contract.projectTitle}</h1>

      {contract.projectTransactionStatus === 'COMPLETED' ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <Star className="size-4" aria-hidden="true" />
            프로젝트가 완료되었습니다. 함께한 상대방에게 리뷰를 남겨 주세요.
          </p>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-md bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700"
            to={`/contracts/${contract.id}/review`}
          >
            리뷰 작성하기
          </Link>
        </div>
      ) : contract.status === 'SIGNED' ? (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <PartyPopper className="size-4" aria-hidden="true" />
          양측 서명이 완료되어 계약이 체결되었습니다. 결제 완료 후 결과물을 제출하고 확인할 수
          있습니다.
        </p>
      ) : null}

      {contract.status === 'SIGNED' ? (
        <Link
          to={`/contracts/${contract.id}/delivery`}
          className="mt-4 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          결과물 제출 · 확인
        </Link>
      ) : null}

      <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">계약 금액</dt>
            <dd className="mt-1 text-lg font-extrabold">{formatWon(contract.agreedAmount)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">계약 기간</dt>
            <dd className="mt-1 font-semibold">
              {formatDate(contract.contractStartAt)} ~ {formatDate(contract.contractEndAt)}
            </dd>
          </div>
          {parties.map((party) => (
            <div key={party.label}>
              <dt className="text-slate-500">{party.label}</dt>
              <dd className="mt-1 font-semibold">{party.name}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-8 text-sm font-bold text-slate-800">계약 조건</h2>
        <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
          {content?.terms ?? '-'}
        </p>

        <h2 className="mt-8 text-sm font-bold text-slate-800">서명</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {parties.map((party) => (
            <li
              key={party.label}
              className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"
            >
              {party.signedAt ? (
                <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
              ) : (
                <Circle className="size-5 text-slate-300" aria-hidden="true" />
              )}
              <div className="text-sm">
                <p className="font-semibold">{party.label}</p>
                <p className="text-slate-500">
                  {party.signedAt
                    ? `${dateTimeFormatter.format(new Date(party.signedAt))} 서명`
                    : '서명 전'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </article>

      {canSign ? (
        <div className="mt-6 grid gap-4 rounded-2xl border border-brand-200 bg-brand-50 p-6">
          <label className="flex items-start gap-3 text-sm font-semibold text-slate-800">
            <input
              type="checkbox"
              className="mt-0.5 size-4"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            위 계약 내용을 모두 확인했으며, 이에 동의하고 서명합니다.
          </label>
          {signMutation.isError ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {getApplicationErrorMessage(signMutation.error)}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button
              className="gap-1.5"
              disabled={!agreed || signMutation.isPending}
              onClick={() => signMutation.mutate()}
            >
              <PenLine className="size-4" aria-hidden="true" />
              {signMutation.isPending ? '서명 중...' : '전자서명하기'}
            </Button>
          </div>
        </div>
      ) : mySignedAt && contract.status !== 'SIGNED' ? (
        <p className="mt-6 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
          서명을 완료했습니다. 상대방의 서명을 기다리고 있습니다.
        </p>
      ) : null}

      {contract.status === 'SIGNED' ? (
        <PaymentAction contract={contract} user={user} isClient={isClient} />
      ) : null}
    </section>
  );
}
