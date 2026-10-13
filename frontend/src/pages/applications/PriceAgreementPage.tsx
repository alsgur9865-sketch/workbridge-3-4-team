import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, CircleDollarSign, Handshake, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AccessNotice } from '@/features/applications/components/AccessNotice';
import { PriceOfferStatusBadge } from '@/features/applications/components/PriceOfferStatusBadge';
import { formatDate, formatWon, getApplicationErrorMessage } from '@/features/applications/format';
import {
  useApplication,
  useOfferPrice,
  useRespondToPriceOffer,
} from '@/features/applications/hooks';
import type { ApplicationDetail } from '@/features/applications/types';
import { useAuthStore } from '@/stores/auth.store';

const offerSchema = z.object({
  amount: z
    .number({ error: '제안할 금액을 입력해 주세요.' })
    .int('금액은 원 단위 정수로 입력해 주세요.')
    .positive('금액은 0원보다 커야 합니다.')
    .max(999_999_999_999, '금액이 너무 큽니다.'),
});

type OfferFormValues = z.infer<typeof offerSchema>;

const steps = ['지원자 선정', '금액 협의', '계약'];

export function PriceAgreementPage() {
  const { applicationId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const applicationQuery = useApplication(applicationId, Boolean(user));

  if (!user) {
    return (
      <AccessNotice
        title="로그인이 필요합니다"
        description="금액 협의를 진행하려면 로그인해 주세요."
        showLoginLink
      />
    );
  }

  if (applicationQuery.isPending) {
    return (
      <p className="mx-auto max-w-3xl px-5 py-24 text-center text-slate-500">불러오는 중...</p>
    );
  }

  if (applicationQuery.isError) {
    return (
      <AccessNotice
        title="금액 협의 정보를 볼 수 없습니다"
        description={getApplicationErrorMessage(applicationQuery.error)}
      />
    );
  }

  const application = applicationQuery.data;
  if (!application.project.isSelected || application.status !== 'ACCEPTED') {
    return (
      <AccessNotice
        title="금액 협의 대상이 아닙니다"
        description="선정된 지원서만 금액 협의를 진행할 수 있습니다."
      />
    );
  }

  const isClient = application.project.clientId === user.id;
  const agreed = application.priceOfferStatus === 'ACCEPTED';

  return (
    <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-700"
        to={isClient ? `/projects/${application.project.id}/applications` : '/applications/me'}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {isClient ? '지원자 목록으로' : '내 지원 현황으로'}
      </Link>

      <p className="mt-6 text-sm font-semibold text-brand-600">금액 협의</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{application.project.title}</h1>

      <ol className="mt-6 flex items-center gap-2 text-xs font-bold" aria-label="진행 단계">
        {steps.map((step, index) => {
          const done = index === 0 || (index === 1 && agreed);
          const current = (index === 1 && !agreed) || (index === 2 && agreed);
          return (
            <li key={step} className="flex items-center gap-2">
              <span
                className={
                  done
                    ? 'rounded-full bg-brand-600 px-3 py-1 text-white'
                    : current
                      ? 'rounded-full bg-brand-50 px-3 py-1 text-brand-700 ring-1 ring-brand-200'
                      : 'rounded-full bg-slate-100 px-3 py-1 text-slate-400'
                }
                aria-current={current ? 'step' : undefined}
              >
                {step}
              </span>
              {index < steps.length - 1 ? <span className="text-slate-300">→</span> : null}
            </li>
          );
        })}
      </ol>

      <dl className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">{isClient ? '선정한 프리랜서' : '프로젝트 의뢰인'}</dt>
          <dd className="mt-1 font-semibold">
            {isClient ? (application.freelancer.name ?? '이름 미등록') : '의뢰인'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">작업 기간</dt>
          <dd className="mt-1 font-semibold">
            {formatDate(application.project.workStartAt)} ~{' '}
            {formatDate(application.project.workEndAt)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">프로젝트 예산</dt>
          <dd className="mt-1 font-semibold">{formatWon(application.project.budget)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">프리랜서 지원 금액</dt>
          <dd className="mt-1 font-semibold">{formatWon(application.proposedAmount)}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <CircleDollarSign className="size-5 text-brand-600" aria-hidden="true" />
            최종 금액 제안
          </h2>
          <PriceOfferStatusBadge status={application.priceOfferStatus} />
        </div>
        {application.clientOfferAmount !== null ? (
          <p className="mt-4 text-3xl font-extrabold tracking-tight">
            {formatWon(application.clientOfferAmount)}
          </p>
        ) : (
          <p className="mt-4 text-slate-500">아직 제안된 금액이 없습니다.</p>
        )}
        {application.offeredAt ? (
          <p className="mt-1 text-xs text-slate-500">{formatDate(application.offeredAt)} 제안</p>
        ) : null}
      </div>

      <div className="mt-6">
        {isClient ? (
          <ClientActions application={application} />
        ) : (
          <FreelancerActions application={application} />
        )}
      </div>
    </section>
  );
}

function AgreedNotice() {
  return (
    <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
      <Handshake className="size-4" aria-hidden="true" />
      최종 금액이 확정되었습니다. 다음 단계는 계약서 작성입니다.
    </p>
  );
}

function InfoNotice({ children }: { children: string }) {
  return (
    <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
      {children}
    </p>
  );
}

function ClientActions({ application }: { application: ApplicationDetail }) {
  const offerMutation = useOfferPrice(application.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfferFormValues>({ resolver: zodResolver(offerSchema) });

  if (application.priceOfferStatus === 'ACCEPTED') {
    return <AgreedNotice />;
  }

  if (application.priceOfferStatus === 'PENDING') {
    return (
      <InfoNotice>
        프리랜서가 제안을 검토하고 있습니다. 응답이 오면 알림으로 알려드립니다.
      </InfoNotice>
    );
  }

  if (application.project.transactionStatus !== 'PRICE_AGREEMENT') {
    return <InfoNotice>지금은 금액 협의 단계가 아닙니다.</InfoNotice>;
  }

  const onSubmit = handleSubmit(({ amount }) => {
    if (!window.confirm(`${formatWon(amount)}을 최종 금액으로 제안할까요?`)) {
      return;
    }
    offerMutation.mutate(amount, { onSuccess: () => reset() });
  });

  return (
    <form className="grid gap-4" onSubmit={onSubmit} noValidate>
      {application.priceOfferStatus === 'REJECTED' ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          이전 제안이 거절되었습니다. 금액을 조정해서 다시 제안해 주세요.
        </p>
      ) : null}
      <div>
        <label className="text-sm font-bold text-slate-800" htmlFor="amount">
          제안할 최종 금액 (원)
        </label>
        <input
          id="amount"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder={String(application.proposedAmount)}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          aria-invalid={Boolean(errors.amount)}
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount ? (
          <p className="mt-2 text-sm text-red-600">{errors.amount.message}</p>
        ) : null}
      </div>
      {offerMutation.isError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {getApplicationErrorMessage(offerMutation.error)}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={offerMutation.isPending}>
          {offerMutation.isPending ? '제안 중...' : '금액 제안하기'}
        </Button>
      </div>
    </form>
  );
}

function FreelancerActions({ application }: { application: ApplicationDetail }) {
  const respondMutation = useRespondToPriceOffer(application.id);

  if (application.priceOfferStatus === 'ACCEPTED') {
    return <AgreedNotice />;
  }

  if (application.priceOfferStatus === 'NONE') {
    return <InfoNotice>의뢰인이 최종 금액을 제안하면 여기에서 확인할 수 있습니다.</InfoNotice>;
  }

  if (application.priceOfferStatus === 'REJECTED') {
    return <InfoNotice>제안을 거절했습니다. 의뢰인의 새로운 제안을 기다리고 있습니다.</InfoNotice>;
  }

  function respond(status: 'ACCEPTED' | 'REJECTED') {
    const amount = formatWon(application.clientOfferAmount ?? 0);
    const message =
      status === 'ACCEPTED'
        ? `${amount}으로 금액을 확정할까요?\n확정하면 계약 단계로 넘어갑니다.`
        : `${amount} 제안을 거절할까요?\n의뢰인이 다시 제안할 수 있습니다.`;
    if (window.confirm(message)) {
      respondMutation.mutate(status);
    }
  }

  return (
    <div className="grid gap-4">
      {respondMutation.isError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {getApplicationErrorMessage(respondMutation.error)}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="gap-1.5"
          disabled={respondMutation.isPending}
          onClick={() => respond('REJECTED')}
        >
          <X className="size-4" aria-hidden="true" />
          거절
        </Button>
        <Button
          className="gap-1.5"
          disabled={respondMutation.isPending}
          onClick={() => respond('ACCEPTED')}
        >
          <Check className="size-4" aria-hidden="true" />이 금액으로 확정
        </Button>
      </div>
    </div>
  );
}
