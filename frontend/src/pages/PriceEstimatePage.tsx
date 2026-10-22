import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CircleDollarSign, LockKeyhole, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  getProjectErrorMessage,
  type PriceEstimateInput,
  usePriceEstimate,
} from '@/features/projects/projects.api';
import { useAuthStore } from '@/stores/auth.store';

const formSchema = z.object({
  title: z.string().trim().min(2, '프로젝트 제목을 입력해 주세요.').max(200),
  description: z.string().trim().min(20, '업무 내용을 20자 이상 입력해 주세요.').max(5000),
  category: z.string().min(1, '카테고리를 선택해 주세요.'),
  estimatedDays: z.number().int().min(1, '예상 기간을 입력해 주세요.').max(365),
  skills: z.string().min(1, '필요 기술을 하나 이상 입력해 주세요.').max(500),
});

type FormValues = z.infer<typeof formSchema>;
const currencyFormatter = new Intl.NumberFormat('ko-KR');
const DRAFT_STORAGE_KEY = 'workbridge-price-estimate-draft';

const emptyFormValues: FormValues = {
  title: '',
  description: '',
  category: '',
  estimatedDays: 30,
  skills: '',
};

function loadDraft() {
  try {
    const savedDraft = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!savedDraft) return emptyFormValues;
    const parsedDraft = formSchema.safeParse(JSON.parse(savedDraft));
    return parsedDraft.success ? parsedDraft.data : emptyFormValues;
  } catch {
    return emptyFormValues;
  }
}

export function PriceEstimatePage() {
  const estimateMutation = usePriceEstimate();
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: loadDraft(),
  });

  function onSubmit(values: FormValues) {
    if (!user) {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
      navigate('/login', { state: { returnTo: location.pathname } });
      return;
    }

    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    const input: PriceEstimateInput = {
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      skills: values.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    };
    estimateMutation.mutate(input);
  }

  const fieldClassName =
    'mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none transition hover:border-black/20 focus:border-[#0071e3] focus:ring-4 focus:ring-blue-100';
  const errorClassName = 'mt-1 text-xs font-bold text-rose-600';
  const result = estimateMutation.data;

  return (
    <main className="soft-grid min-h-[70vh] bg-[#f5f5f7]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-16">
        <Link
          className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-black/5 transition hover:text-[#0071e3]"
          to="/projects"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          프로젝트 목록
        </Link>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-start">
          <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-9 lg:p-11">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-[#0071e3] shadow-sm ring-1 ring-blue-100">
              <Sparkles className="size-6" aria-hidden="true" />
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-[-0.04em] text-[#1d1d1f] sm:text-4xl">
              AI 프로젝트 적정 가격 분석
            </h1>
            <p className="mt-3 leading-7 text-slate-600">
              업무 범위와 기간, 필요한 기술을 바탕으로 예상 견적 범위와 판단 근거를 확인하세요.
            </p>

            {!user ? (
              <div className="mt-6 flex gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-950">
                <LockKeyhole className="mt-0.5 size-5 shrink-0 text-[#0071e3]" aria-hidden="true" />
                <div>
                  <p className="font-black">로그인 후 AI 분석이 시작됩니다.</p>
                  <p className="mt-1 leading-6 text-blue-800/80">
                    입력한 내용은 이 기기에 임시 저장되어 로그인 후에도 그대로 이어집니다.
                  </p>
                </div>
              </div>
            ) : null}

            <form className="mt-8 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
              <label className="font-bold text-slate-800">
                프로젝트 제목
                <input
                  className={fieldClassName}
                  placeholder="예: 쇼핑몰 관리자 대시보드 개발"
                  {...register('title')}
                />
                {errors.title ? <p className={errorClassName}>{errors.title.message}</p> : null}
              </label>

              <label className="font-bold text-slate-800">
                업무 내용
                <textarea
                  className="mt-2 min-h-40 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none transition hover:border-black/20 focus:border-[#0071e3] focus:ring-4 focus:ring-blue-100"
                  placeholder="필요한 기능과 결과물을 구체적으로 입력해 주세요."
                  {...register('description')}
                />
                {errors.description ? (
                  <p className={errorClassName}>{errors.description.message}</p>
                ) : null}
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="font-bold text-slate-800">
                  카테고리
                  <select className={fieldClassName} {...register('category')}>
                    <option value="">선택해 주세요</option>
                    <option value="Web Development">웹 개발</option>
                    <option value="Design">디자인</option>
                    <option value="Marketing">마케팅</option>
                    <option value="Other">기타</option>
                  </select>
                  {errors.category ? (
                    <p className={errorClassName}>{errors.category.message}</p>
                  ) : null}
                </label>
                <label className="font-bold text-slate-800">
                  예상 작업 기간
                  <div className="relative">
                    <input
                      className={`${fieldClassName} pr-12`}
                      min="1"
                      max="365"
                      type="number"
                      {...register('estimatedDays', { valueAsNumber: true })}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                      일
                    </span>
                  </div>
                  {errors.estimatedDays ? (
                    <p className={errorClassName}>{errors.estimatedDays.message}</p>
                  ) : null}
                </label>
              </div>

              <label className="font-bold text-slate-800">
                필요 기술
                <input
                  className={fieldClassName}
                  placeholder="React, TypeScript, Node.js"
                  {...register('skills')}
                />
                <p className="mt-1 text-xs font-medium text-slate-500">기술은 쉼표로 구분하세요.</p>
                {errors.skills ? <p className={errorClassName}>{errors.skills.message}</p> : null}
              </label>

              {estimateMutation.isError ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  {getProjectErrorMessage(estimateMutation.error)}
                </div>
              ) : null}

              <button
                className="h-12 rounded-full bg-[#0071e3] px-6 font-black text-white shadow-[0_12px_30px_rgba(0,113,227,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0077ed] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={estimateMutation.isPending}
                type="submit"
              >
                {estimateMutation.isPending
                  ? 'AI가 분석하고 있습니다...'
                  : user
                    ? '적정 가격 분석하기'
                    : '로그인하고 분석하기'}
              </button>
            </form>
          </section>

          <aside className="h-fit overflow-hidden rounded-[2rem] bg-[#1d1d1f] p-6 text-white shadow-[0_28px_80px_rgba(15,23,42,0.2)] sm:p-8 lg:sticky lg:top-24">
            <div className="flex items-center gap-3">
              <CircleDollarSign className="size-7 text-brand-300" aria-hidden="true" />
              <h2 className="text-xl font-black">분석 결과</h2>
            </div>

            {result ? (
              <div className="mt-7">
                <p className="text-sm font-bold text-slate-400">추천 견적</p>
                <p className="mt-2 text-3xl font-black">
                  {currencyFormatter.format(result.estimatedTotalAmount)}원
                </p>
                <p className="mt-2 text-sm font-bold text-brand-200">
                  {currencyFormatter.format(result.estimatedMinAmount)}원 ~{' '}
                  {currencyFormatter.format(result.estimatedMaxAmount)}원
                </p>
                <p className="mt-6 leading-7 text-slate-300">{result.summary}</p>

                <h3 className="mt-7 font-black">주요 판단 요소</h3>
                <ul className="mt-3 grid gap-3">
                  {result.factors.map((factor) => (
                    <li
                      className="rounded-xl bg-white/5 p-4"
                      key={`${factor.label}-${factor.reason}`}
                    >
                      <p className="font-bold text-white">{factor.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-300">{factor.reason}</p>
                    </li>
                  ))}
                </ul>

                <h3 className="mt-7 font-black">분석 가정</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">
                  {result.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 px-5 py-12 text-center">
                <Sparkles className="mx-auto size-8 text-brand-300" aria-hidden="true" />
                <p className="mt-4 font-bold text-slate-200">
                  프로젝트 정보를 입력하면 분석 결과가 여기에 표시됩니다.
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {user
                    ? 'API 키가 없을 때는 설정 안내가 표시되고, 데이터는 전송되지 않습니다.'
                    : '로그인 후 입력한 정보를 그대로 이어서 분석할 수 있습니다.'}
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
