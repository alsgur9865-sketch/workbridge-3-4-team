import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, FileSignature } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AccessNotice } from '@/features/applications/components/AccessNotice';
import { formatWon, getApplicationErrorMessage } from '@/features/applications/format';
import { useApplication } from '@/features/applications/hooks';
import type { ApplicationDetail } from '@/features/applications/types';
import { useCreateContract } from '@/features/contracts/hooks';
import { useAuthStore } from '@/stores/auth.store';

const contractSchema = z
  .object({
    contractStartAt: z.string().min(1, '계약 시작일을 선택해 주세요.'),
    contractEndAt: z.string().min(1, '계약 종료일을 선택해 주세요.'),
    terms: z
      .string()
      .trim()
      .min(10, '계약 조건은 10자 이상 입력해 주세요.')
      .max(5000, '계약 조건은 5,000자까지 입력할 수 있습니다.'),
  })
  .refine((values) => values.contractEndAt > values.contractStartAt, {
    path: ['contractEndAt'],
    message: '계약 종료일은 시작일보다 뒤여야 합니다.',
  });

type ContractFormValues = z.infer<typeof contractSchema>;

const inputClassName =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

function toDateInput(value: string) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toIsoDate(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function defaultTerms(application: ApplicationDetail) {
  return [
    `1. 작업 범위: '${application.project.title}' 프로젝트 공고 및 지원서에 기재된 내용을 기준으로 한다.`,
    '2. 산출물: 작업 결과물과 소스 코드 일체를 계약 종료일까지 납품한다.',
    '3. 대금 지급: 합의 금액은 플랫폼 안전결제를 통해 지급하며, 납품 승인 후 정산한다.',
    '4. 수정 요청: 납품 후 7일 이내 합리적인 범위의 수정 요청을 반영한다.',
    '5. 비밀 유지: 양 당사자는 작업 중 알게 된 정보를 제3자에게 공개하지 않는다.',
  ].join('\n');
}

export function ContractCreatePage() {
  const { applicationId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const applicationQuery = useApplication(applicationId, user?.role === 'CLIENT');

  if (!user) {
    return (
      <AccessNotice
        title="로그인이 필요합니다"
        description="계약서를 작성하려면 의뢰인 계정으로 로그인해 주세요."
        showLoginLink
      />
    );
  }

  if (user.role !== 'CLIENT') {
    return (
      <AccessNotice
        title="의뢰인만 작성할 수 있습니다"
        description="계약서는 프로젝트를 등록한 의뢰인이 작성합니다."
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
        title="계약서를 작성할 수 없습니다"
        description={getApplicationErrorMessage(applicationQuery.error)}
      />
    );
  }

  const application = applicationQuery.data;
  if (application.contract) {
    return (
      <AccessNotice
        title="이미 계약서가 있습니다"
        description="작성된 계약서에서 서명을 진행해 주세요."
      />
    );
  }

  if (application.priceOfferStatus !== 'ACCEPTED' || application.clientOfferAmount === null) {
    return (
      <AccessNotice
        title="아직 금액이 확정되지 않았습니다"
        description="프리랜서와 최종 금액을 확정한 뒤 계약서를 작성할 수 있습니다."
      />
    );
  }

  return <ContractForm application={application} />;
}

function ContractForm({ application }: { application: ApplicationDetail }) {
  const navigate = useNavigate();
  const createMutation = useCreateContract();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractStartAt: toDateInput(application.project.workStartAt),
      contractEndAt: toDateInput(application.project.workEndAt),
      terms: defaultTerms(application),
    },
  });

  const onSubmit = handleSubmit((values) => {
    createMutation.mutate(
      {
        applicationId: application.id,
        contractStartAt: toIsoDate(values.contractStartAt),
        contractEndAt: toIsoDate(values.contractEndAt),
        terms: values.terms,
      },
      { onSuccess: (contract) => navigate(`/contracts/${contract.id}`) },
    );
  });

  return (
    <section className="mx-auto max-w-3xl px-5 py-12 sm:px-6">
      <Link
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-brand-700"
        to={`/applications/${application.id}/price`}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        금액 협의로
      </Link>

      <p className="mt-6 text-sm font-semibold text-brand-600">계약서 작성</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{application.project.title}</h1>

      <dl className="mt-8 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">프리랜서</dt>
          <dd className="mt-1 font-semibold">{application.freelancer.name ?? '이름 미등록'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">계약 금액 (확정)</dt>
          <dd className="mt-1 text-lg font-extrabold">
            {formatWon(application.clientOfferAmount ?? 0)}
          </dd>
        </div>
      </dl>

      <form className="mt-8 grid gap-6" onSubmit={onSubmit} noValidate>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="contractStartAt">
              계약 시작일
            </label>
            <input
              id="contractStartAt"
              type="date"
              className={inputClassName}
              {...register('contractStartAt')}
            />
            {errors.contractStartAt ? (
              <p className="mt-2 text-sm text-red-600">{errors.contractStartAt.message}</p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="contractEndAt">
              계약 종료일
            </label>
            <input
              id="contractEndAt"
              type="date"
              className={inputClassName}
              {...register('contractEndAt')}
            />
            {errors.contractEndAt ? (
              <p className="mt-2 text-sm text-red-600">{errors.contractEndAt.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-800" htmlFor="terms">
            계약 조건
          </label>
          <textarea id="terms" rows={9} className={inputClassName} {...register('terms')} />
          {errors.terms ? (
            <p className="mt-2 text-sm text-red-600">{errors.terms.message}</p>
          ) : null}
        </div>

        {createMutation.isError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {getApplicationErrorMessage(createMutation.error)}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" className="gap-1.5" disabled={createMutation.isPending}>
            <FileSignature className="size-4" aria-hidden="true" />
            {createMutation.isPending ? '작성 중...' : '계약서 작성 완료'}
          </Button>
        </div>
      </form>
    </section>
  );
}
