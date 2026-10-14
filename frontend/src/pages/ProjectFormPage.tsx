import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth.store';
import {
  getProjectErrorMessage,
  type Project,
  type ProjectInput,
  useCreateProject,
  useProject,
  useUpdateProject,
} from '@/features/projects/projects.api';

const projectFormSchema = z
  .object({
    title: z.string().trim().min(2, '제목을 2자 이상 입력해 주세요.').max(200),
    description: z.string().trim().min(20, '설명을 20자 이상 입력해 주세요.').max(5000),
    category: z.string().min(1, '카테고리를 선택해 주세요.'),
    budget: z
      .number({ error: '예산을 숫자로 입력해 주세요.' })
      .int('예산은 원 단위 정수로 입력해 주세요.')
      .positive('예산을 입력해 주세요.')
      .max(1_000_000_000, '예산은 10억 원 이하로 입력해 주세요.'),
    workStartAt: z.string().min(1, '작업 시작일을 입력해 주세요.'),
    workEndAt: z.string().min(1, '작업 종료일을 입력해 주세요.'),
    recruitmentDeadline: z.string().min(1, '모집 마감일을 입력해 주세요.'),
    skills: z.string().max(500),
  })
  .superRefine((value, context) => {
    if (new Date(value.workStartAt) >= new Date(value.workEndAt)) {
      context.addIssue({
        code: 'custom',
        path: ['workEndAt'],
        message: '종료일은 시작일보다 이후여야 합니다.',
      });
    }
    if (new Date(value.recruitmentDeadline) > new Date(value.workStartAt)) {
      context.addIssue({
        code: 'custom',
        path: ['recruitmentDeadline'],
        message: '모집 마감일은 작업 시작일보다 늦을 수 없습니다.',
      });
    }
  });

type ProjectFormValues = z.infer<typeof projectFormSchema>;

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function initialValues(project?: Project): ProjectFormValues {
  if (project) {
    return {
      title: project.title,
      description: project.description,
      category: project.category,
      budget: project.budget,
      workStartAt: toLocalDateTime(project.workStartAt),
      workEndAt: toLocalDateTime(project.workEndAt),
      recruitmentDeadline: toLocalDateTime(project.recruitmentDeadline),
      skills: project.skills.join(', '),
    };
  }

  return {
    title: '',
    description: '',
    category: '',
    budget: 0,
    workStartAt: '',
    workEndAt: '',
    recruitmentDeadline: '',
    skills: '',
  };
}

function ProjectForm({ project }: { project?: Project }) {
  const navigate = useNavigate();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject(project?.id ?? '');
  const mutation = project ? updateMutation : createMutation;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialValues(project),
  });

  async function onSubmit(values: ProjectFormValues) {
    const input: ProjectInput = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      budget: values.budget,
      workStartAt: new Date(values.workStartAt).toISOString(),
      workEndAt: new Date(values.workEndAt).toISOString(),
      recruitmentDeadline: new Date(values.recruitmentDeadline).toISOString(),
      skills: values.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
    };

    try {
      const savedProject = await mutation.mutateAsync(input);
      navigate(`/projects/${savedProject.id}`);
    } catch {
      return;
    }
  }

  const fieldClassName =
    'mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100';
  const errorClassName = 'mt-1 text-xs font-bold text-rose-600';

  return (
    <form className="mt-8 grid gap-6" noValidate onSubmit={handleSubmit(onSubmit)}>
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
        상세 설명
        <textarea
          className="mt-2 min-h-44 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          placeholder="필요한 기능, 결과물, 협업 방식을 구체적으로 적어 주세요."
          {...register('description')}
        />
        {errors.description ? <p className={errorClassName}>{errors.description.message}</p> : null}
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
          {errors.category ? <p className={errorClassName}>{errors.category.message}</p> : null}
        </label>
        <label className="font-bold text-slate-800">
          예산
          <div className="relative">
            <input
              className={`${fieldClassName} pr-12`}
              min="1"
              step="1"
              aria-invalid={Boolean(errors.budget)}
              aria-describedby={errors.budget ? 'budget-error' : undefined}
              type="number"
              {...register('budget', { valueAsNumber: true })}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
              원
            </span>
          </div>
          {errors.budget ? (
            <p className={errorClassName} id="budget-error" role="alert">
              {errors.budget.message}
            </p>
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
        <p className="mt-1 text-xs font-medium text-slate-500">
          쉼표로 구분해 최대 10개까지 입력하세요.
        </p>
      </label>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="font-bold text-slate-800">
          모집 마감일
          <input
            className={fieldClassName}
            type="datetime-local"
            {...register('recruitmentDeadline')}
          />
          {errors.recruitmentDeadline ? (
            <p className={errorClassName}>{errors.recruitmentDeadline.message}</p>
          ) : null}
        </label>
        <label className="font-bold text-slate-800">
          작업 시작일
          <input className={fieldClassName} type="datetime-local" {...register('workStartAt')} />
          {errors.workStartAt ? (
            <p className={errorClassName}>{errors.workStartAt.message}</p>
          ) : null}
        </label>
        <label className="font-bold text-slate-800">
          작업 종료일
          <input className={fieldClassName} type="datetime-local" {...register('workEndAt')} />
          {errors.workEndAt ? <p className={errorClassName}>{errors.workEndAt.message}</p> : null}
        </label>
      </div>

      {mutation.isError ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {getProjectErrorMessage(mutation.error)}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700"
          to={project ? `/projects/${project.id}` : '/projects'}
        >
          취소
        </Link>
        <button
          className="h-11 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? '저장 중...' : project ? '수정 완료' : '프로젝트 등록'}
        </button>
      </div>
    </form>
  );
}

export function ProjectFormPage() {
  const { projectId } = useParams();
  const user = useAuthStore((state) => state.user);
  const projectQuery = useProject(projectId ?? '', user?.role === 'CLIENT');
  const isEditing = Boolean(projectId);

  if (user?.role !== 'CLIENT') {
    return (
      <main className="px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">의뢰인만 프로젝트를 등록할 수 있습니다</h1>
        <Link
          className="mt-5 inline-block font-bold text-brand-700 underline"
          to={user ? '/projects' : '/login'}
        >
          {user ? '프로젝트 둘러보기' : '로그인하러 가기'}
        </Link>
      </main>
    );
  }

  if (isEditing && projectQuery.isPending) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-4xl px-5 py-16 text-center text-slate-500">
        프로젝트 정보를 불러오고 있습니다.
      </main>
    );
  }

  if (isEditing && (projectQuery.isError || !projectQuery.data)) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-4xl px-5 py-16 text-center">
        <h1 className="text-2xl font-black">수정할 프로젝트를 찾을 수 없습니다.</h1>
        <Link className="mt-5 inline-flex font-bold text-brand-700" to="/projects">
          프로젝트 목록으로
        </Link>
      </main>
    );
  }

  if (isEditing && projectQuery.data?.clientId !== user.id) {
    return (
      <main className="px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">작성자만 프로젝트를 수정할 수 있습니다</h1>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:px-8">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-700"
          to={projectId ? `/projects/${projectId}` : '/projects'}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          돌아가기
        </Link>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-600">
            Client project
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            {isEditing ? '프로젝트 수정' : '프로젝트 등록'}
          </h1>
          <p className="mt-3 text-slate-600">
            프리랜서가 업무 범위를 정확히 이해할 수 있도록 구체적으로 작성해 주세요.
          </p>
          <ProjectForm project={projectQuery.data} />
        </section>
      </div>
    </main>
  );
}
