import { zodResolver } from '@hookform/resolvers/zod';
import { BriefcaseBusiness, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import {
  getProfileErrorMessage,
  type ClientProfile,
  type FreelancerProfile,
  type MyProfile,
  type ProfileCategory,
  useMyProfile,
  useUpdateClientProfile,
  useUpdateCommonProfile,
  useUpdateFreelancerProfile,
} from '@/features/profile/api';
import { useAuthStore } from '@/stores/auth.store';

const commonSchema = z.object({
  name: z.string().trim().min(1, '이름을 입력해 주세요.').max(100),
  bio: z.string().trim().max(1000, '소개는 1000자 이하로 입력해 주세요.'),
  profileImageUrl: z
    .string()
    .trim()
    .refine((value) => !value || z.string().url().safeParse(value).success, '올바른 URL을 입력해 주세요.'),
});

const clientSchema = z.object({
  companyName: z.string().trim().min(1, '회사 또는 팀 이름을 입력해 주세요.').max(150),
  industry: z.string().trim().min(1, '산업 분야를 입력해 주세요.').max(100),
  websiteUrl: z
    .string()
    .trim()
    .refine((value) => !value || z.string().url().safeParse(value).success, '올바른 URL을 입력해 주세요.'),
});

const freelancerSchema = z.object({
  mainCategory: z.string().min(1, '주 분야를 선택해 주세요.'),
  careerYears: z
    .number({ error: '경력 연수를 입력해 주세요.' })
    .int('경력은 정수로 입력해 주세요.')
    .min(0, '경력은 0년 이상이어야 합니다.')
    .max(50, '경력은 50년 이하로 입력해 주세요.'),
  desiredRate: z
    .number({ error: '희망 금액을 입력해 주세요.' })
    .int('희망 금액은 원 단위 정수로 입력해 주세요.')
    .positive('희망 금액은 0원보다 커야 합니다.')
    .max(1_000_000_000, '희망 금액은 10억 원 이하로 입력해 주세요.'),
  portfolioUrl: z
    .string()
    .trim()
    .refine((value) => !value || z.string().url().safeParse(value).success, '올바른 URL을 입력해 주세요.'),
  skills: z.string().max(1000),
});

type CommonValues = z.infer<typeof commonSchema>;
type ClientValues = z.infer<typeof clientSchema>;
type FreelancerValues = z.infer<typeof freelancerSchema>;

const inputClassName =
  'mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100';
const textAreaClassName =
  'mt-2 min-h-32 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100';
const errorClassName = 'mt-1 text-xs font-bold text-rose-600';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const profileQuery = useMyProfile();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profileQuery.isPending) {
    return <main className="px-5 py-20 text-center text-slate-500">프로필을 불러오는 중...</main>;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-20 text-center">
        <h1 className="text-2xl font-black">프로필을 불러오지 못했습니다.</h1>
        <button
          className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white"
          type="button"
          onClick={() => void profileQuery.refetch()}
        >
          다시 시도
        </button>
      </main>
    );
  }

  const profile = profileQuery.data;

  return (
    <main className="min-h-[70vh] bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-600">My profile</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">내 프로필</h1>
          <p className="mt-2 text-slate-600">
            기본 정보와 {profile.role === 'CLIENT' ? '의뢰인' : '프리랜서'} 정보를 관리합니다.
          </p>
        </div>

        <div className="mt-8 grid gap-6">
          <CommonProfileForm profile={profile} />

          {profile.role === 'CLIENT' ? (
            <ClientProfileForm profile={profile.profile?.role === 'CLIENT' ? profile.profile : null} />
          ) : null}

          {profile.role === 'FREELANCER' ? (
            <FreelancerProfileForm
              profile={profile.profile?.role === 'FREELANCER' ? profile.profile : null}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          {icon}
        </span>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function CommonProfileForm({ profile }: { profile: MyProfile }) {
  const mutation = useUpdateCommonProfile();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CommonValues>({
    resolver: zodResolver(commonSchema),
    defaultValues: {
      name: profile.name ?? '',
      bio: profile.bio ?? '',
      profileImageUrl: profile.profileImageUrl ?? '',
    },
  });

  return (
    <Section
      icon={<UserRound className="size-5" aria-hidden="true" />}
      title="기본 정보"
      description="서비스 전반에서 사용하는 이름과 소개를 수정합니다."
    >
      <form
        className="mt-6 grid gap-5"
        noValidate
        onSubmit={handleSubmit((values) =>
          mutation.mutate({
            name: values.name.trim(),
            bio: values.bio.trim() || null,
            profileImageUrl: values.profileImageUrl.trim() || null,
          }),
        )}
      >
        <label className="font-bold text-slate-800">
          이름
          <input className={inputClassName} {...register('name')} />
          {errors.name ? <p className={errorClassName}>{errors.name.message}</p> : null}
        </label>

        <label className="font-bold text-slate-800">
          자기소개
          <textarea
            className={textAreaClassName}
            placeholder="간단한 소개를 작성해 주세요."
            {...register('bio')}
          />
          {errors.bio ? <p className={errorClassName}>{errors.bio.message}</p> : null}
        </label>

        <label className="font-bold text-slate-800">
          프로필 이미지 URL
          <input
            className={inputClassName}
            placeholder="https://example.com/profile.jpg"
            {...register('profileImageUrl')}
          />
          {errors.profileImageUrl ? (
            <p className={errorClassName}>{errors.profileImageUrl.message}</p>
          ) : null}
        </label>

        <SaveArea mutation={mutation} />
      </form>
    </Section>
  );
}

function ClientProfileForm({ profile }: { profile: ClientProfile | null }) {
  const mutation = useUpdateClientProfile();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: profile?.companyName ?? '',
      industry: profile?.industry ?? '',
      websiteUrl: profile?.websiteUrl ?? '',
    },
  });

  return (
    <Section
      icon={<BriefcaseBusiness className="size-5" aria-hidden="true" />}
      title="의뢰인 정보"
      description="프리랜서에게 보여줄 회사 또는 팀 정보를 입력합니다."
    >
      <form
        className="mt-6 grid gap-5"
        noValidate
        onSubmit={handleSubmit((values) =>
          mutation.mutate({
            companyName: values.companyName.trim(),
            industry: values.industry.trim(),
            websiteUrl: values.websiteUrl.trim() || null,
          }),
        )}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="font-bold text-slate-800">
            회사 / 팀 이름
            <input className={inputClassName} {...register('companyName')} />
            {errors.companyName ? (
              <p className={errorClassName}>{errors.companyName.message}</p>
            ) : null}
          </label>

          <label className="font-bold text-slate-800">
            산업 분야
            <input className={inputClassName} placeholder="예: IT / SaaS" {...register('industry')} />
            {errors.industry ? <p className={errorClassName}>{errors.industry.message}</p> : null}
          </label>
        </div>

        <label className="font-bold text-slate-800">
          웹사이트
          <input
            className={inputClassName}
            placeholder="https://company.example.com"
            {...register('websiteUrl')}
          />
          {errors.websiteUrl ? <p className={errorClassName}>{errors.websiteUrl.message}</p> : null}
        </label>

        <SaveArea mutation={mutation} />
      </form>
    </Section>
  );
}

function FreelancerProfileForm({ profile }: { profile: FreelancerProfile | null }) {
  const mutation = useUpdateFreelancerProfile();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FreelancerValues>({
    resolver: zodResolver(freelancerSchema),
    defaultValues: {
      mainCategory: profile?.mainCategory ?? '',
      careerYears: profile?.careerYears ?? 0,
      desiredRate: profile?.desiredRate ?? 0,
      portfolioUrl: profile?.portfolioUrl ?? '',
      skills: profile?.skills.join(', ') ?? '',
    },
  });

  return (
    <Section
      icon={<BriefcaseBusiness className="size-5" aria-hidden="true" />}
      title="프리랜서 정보"
      description="이 정보는 프로젝트 추천과 지원자 프로필에 사용됩니다."
    >
      {!profile ? (
        <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          프로필을 완성하면 기술과 주 분야를 기준으로 프로젝트 추천을 받을 수 있습니다.
        </p>
      ) : null}

      <form
        className="mt-6 grid gap-5"
        noValidate
        onSubmit={handleSubmit((values) =>
          mutation.mutate({
            mainCategory: values.mainCategory as ProfileCategory,
            careerYears: values.careerYears,
            desiredRate: values.desiredRate,
            portfolioUrl: values.portfolioUrl.trim() || null,
            skills: values.skills
              .split(',')
              .map((skill) => skill.trim())
              .filter(Boolean),
          }),
        )}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="font-bold text-slate-800">
            주 분야
            <select className={inputClassName} {...register('mainCategory')}>
              <option value="">선택해 주세요</option>
              <option value="Web Development">웹 개발</option>
              <option value="Design">디자인</option>
              <option value="Marketing">마케팅</option>
              <option value="Other">기타</option>
            </select>
            {errors.mainCategory ? (
              <p className={errorClassName}>{errors.mainCategory.message}</p>
            ) : null}
          </label>

          <label className="font-bold text-slate-800">
            경력 연수
            <input
              className={inputClassName}
              type="number"
              min="0"
              max="50"
              {...register('careerYears', { valueAsNumber: true })}
            />
            {errors.careerYears ? (
              <p className={errorClassName}>{errors.careerYears.message}</p>
            ) : null}
          </label>
        </div>

        <label className="font-bold text-slate-800">
          희망 프로젝트 금액
          <div className="relative">
            <input
              className={`${inputClassName} pr-12`}
              type="number"
              min="1"
              step="1"
              {...register('desiredRate', { valueAsNumber: true })}
            />
            <span className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-sm font-bold text-slate-500">
              원
            </span>
          </div>
          {errors.desiredRate ? <p className={errorClassName}>{errors.desiredRate.message}</p> : null}
        </label>

        <label className="font-bold text-slate-800">
          보유 기술
          <input
            className={inputClassName}
            placeholder="React, TypeScript, Node.js"
            {...register('skills')}
          />
          <p className="mt-1 text-xs font-medium text-slate-500">
            쉼표로 구분해 최대 10개까지 입력할 수 있습니다.
          </p>
          {errors.skills ? <p className={errorClassName}>{errors.skills.message}</p> : null}
        </label>

        <label className="font-bold text-slate-800">
          포트폴리오 URL
          <input
            className={inputClassName}
            placeholder="https://portfolio.example.com"
            {...register('portfolioUrl')}
          />
          {errors.portfolioUrl ? (
            <p className={errorClassName}>{errors.portfolioUrl.message}</p>
          ) : null}
        </label>

        <SaveArea mutation={mutation} />
      </form>
    </Section>
  );
}

function SaveArea({
  mutation,
}: {
  mutation: {
    isPending: boolean;
    isError: boolean;
    isSuccess: boolean;
    error: unknown;
  };
}) {
  return (
    <div className="border-t border-slate-100 pt-5">
      {mutation.isError ? (
        <p className="mb-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">
          {getProfileErrorMessage(mutation.error)}
        </p>
      ) : null}
      {mutation.isSuccess ? (
        <p className="mb-3 text-sm font-bold text-emerald-700">저장되었습니다.</p>
      ) : null}
      <div className="flex justify-end">
        <button
          className="h-11 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}
