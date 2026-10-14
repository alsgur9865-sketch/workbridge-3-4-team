import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { AccessNotice } from '@/features/applications/components/AccessNotice';
import { getApplicationErrorMessage } from '@/features/applications/format';
import { useApplyToProject } from '@/features/applications/hooks';
import { useAuthStore } from '@/stores/auth.store';
import { useProject } from '@/features/projects/projects.api';

const applySchema = z.object({
  introduction: z
    .string()
    .trim()
    .min(10, '자기소개는 10자 이상 입력해 주세요.')
    .max(2000, '자기소개는 2,000자까지 입력할 수 있습니다.'),
  proposedAmount: z
    .number({ error: '제안 금액을 입력해 주세요.' })
    .int('제안 금액은 원 단위 정수로 입력해 주세요.')
    .positive('제안 금액은 0원보다 커야 합니다.')
    .max(999_999_999_999, '제안 금액이 너무 큽니다.'),
  estimatedDays: z
    .number({ error: '예상 작업 기간을 입력해 주세요.' })
    .int('예상 작업 기간은 일 단위 정수로 입력해 주세요.')
    .min(1, '예상 작업 기간은 1일 이상이어야 합니다.')
    .max(365, '예상 작업 기간은 365일 이하로 입력해 주세요.'),
});

type ApplyFormValues = z.infer<typeof applySchema>;

const inputClassName =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function ApplyPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const applyMutation = useApplyToProject(projectId);
  const projectQuery = useProject(projectId, user?.role === 'FREELANCER');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    defaultValues: { introduction: '' },
  });

  if (!user) {
    return (
      <AccessNotice
        title="로그인이 필요합니다"
        description="프로젝트에 지원하려면 프리랜서 계정으로 로그인해 주세요."
        showLoginLink
      />
    );
  }

  if (user.role !== 'FREELANCER') {
    return (
      <AccessNotice
        title="프리랜서만 지원할 수 있습니다"
        description="프로젝트 지원은 프리랜서 역할의 계정에서만 가능합니다."
      />
    );
  }

  if (projectQuery.isPending) {
    return (
      <p className="px-5 py-16 text-center" role="status">
        프로젝트 모집 상태를 확인하고 있습니다.
      </p>
    );
  }
  if (projectQuery.isError || !projectQuery.data) {
    return (
      <AccessNotice
        title="프로젝트를 확인할 수 없습니다"
        description="프로젝트 목록에서 다시 확인해 주세요."
      />
    );
  }
  if (projectQuery.data.myApplication || projectQuery.data.recruitmentStatus !== 'OPEN') {
    return (
      <section className="px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">
          {projectQuery.data.myApplication
            ? '이미 지원한 프로젝트입니다'
            : projectQuery.data.recruitmentStatus === 'SCHEDULED'
              ? '아직 모집 시작 전입니다'
              : '모집이 마감되었습니다'}
        </h1>
        <Link
          className="mt-5 inline-block font-bold text-brand-700 underline"
          to={`/projects/${projectId}`}
        >
          프로젝트 상세로 돌아가기
        </Link>
      </section>
    );
  }

  const onSubmit = handleSubmit((values) => {
    applyMutation.mutate(values, {
      onSuccess: () => navigate('/applications/me', { state: { applied: true } }),
    });
  });

  return (
    <section className="mx-auto max-w-2xl px-5 py-12 sm:px-6">
      <p className="text-sm font-semibold text-brand-600">프로젝트 지원</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">지원서 작성</h1>
      <p className="mt-3 text-slate-600">
        의뢰인이 지원서를 보고 함께할 프리랜서를 선택합니다. 경험과 강점을 구체적으로 적어 주세요.
      </p>

      <form className="mt-10 grid gap-6" onSubmit={onSubmit} noValidate>
        <div>
          <label className="text-sm font-bold text-slate-800" htmlFor="introduction">
            자기소개 및 수행 계획
          </label>
          <textarea
            id="introduction"
            rows={8}
            className={inputClassName}
            placeholder="비슷한 프로젝트 경험, 사용할 기술, 작업 진행 방식 등을 적어 주세요."
            aria-invalid={Boolean(errors.introduction)}
            {...register('introduction')}
          />
          {errors.introduction ? (
            <p className="mt-2 text-sm text-red-600">{errors.introduction.message}</p>
          ) : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="proposedAmount">
              제안 금액 (원)
            </label>
            <input
              id="proposedAmount"
              type="number"
              inputMode="numeric"
              min={1}
              className={inputClassName}
              placeholder="3000000"
              aria-invalid={Boolean(errors.proposedAmount)}
              {...register('proposedAmount', { valueAsNumber: true })}
            />
            {errors.proposedAmount ? (
              <p className="mt-2 text-sm text-red-600">{errors.proposedAmount.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="estimatedDays">
              예상 작업 기간 (일)
            </label>
            <input
              id="estimatedDays"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              className={inputClassName}
              placeholder="30"
              aria-invalid={Boolean(errors.estimatedDays)}
              {...register('estimatedDays', { valueAsNumber: true })}
            />
            {errors.estimatedDays ? (
              <p className="mt-2 text-sm text-red-600">{errors.estimatedDays.message}</p>
            ) : null}
          </div>
        </div>

        {applyMutation.isError ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {getApplicationErrorMessage(applyMutation.error)}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-100"
            to={`/projects/${projectId}`}
          >
            취소
          </Link>
          <Button type="submit" disabled={applyMutation.isPending} className="gap-2">
            <Send className="size-4" aria-hidden="true" />
            {applyMutation.isPending ? '제출 중...' : '지원서 제출'}
          </Button>
        </div>
      </form>
    </section>
  );
}
