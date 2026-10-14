import { ArrowLeft, BriefcaseBusiness, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  getProjectErrorMessage,
  useDeleteProject,
  useProject,
} from '@/features/projects/projects.api';
import { BookmarkButton } from '@/features/projects/BookmarkButton';
import { applicationStatusLabels } from '@/features/applications/format';
import { useAuthStore } from '@/stores/auth.store';

const currencyFormatter = new Intl.NumberFormat('ko-KR');
const dateFormatter = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long' });

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const projectQuery = useProject(projectId);
  const deleteMutation = useDeleteProject();
  const user = useAuthStore((state) => state.user);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (projectQuery.isPending) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-5xl px-5 py-16 text-center text-slate-500">
        프로젝트 정보를 불러오고 있습니다.
      </main>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <main className="mx-auto min-h-[60vh] max-w-5xl px-5 py-16 text-center">
        <h1 className="text-2xl font-black text-slate-950">프로젝트를 찾을 수 없습니다.</h1>
        <Link className="mt-5 inline-flex font-bold text-brand-700 hover:underline" to="/projects">
          프로젝트 목록으로
        </Link>
      </main>
    );
  }

  const project = projectQuery.data;
  const clientName = project.client.companyName ?? project.client.name ?? 'WorkBridge 의뢰인';
  const canManageProject = user?.role === 'CLIENT' && user.id === project.clientId;

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(projectId);
      navigate('/projects');
    } catch {
      setConfirmDelete(false);
    }
  }

  return (
    <main className="min-h-[70vh] bg-slate-50">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 lg:px-8">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-700"
          to="/projects"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          프로젝트 목록
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                {project.recruitmentStatus === 'OPEN'
                  ? '모집 중'
                  : project.recruitmentStatus === 'SCHEDULED'
                    ? '모집 예정'
                    : '모집 종료'}
              </span>
              <span className="text-sm font-bold text-slate-500">{project.category}</span>
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {project.title}
            </h1>
            <div className="mt-5 flex flex-wrap gap-2">
              {project.skills.map((skill) => (
                <span
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"
                  key={skill}
                >
                  {skill}
                </span>
              ))}
            </div>

            <section className="mt-9 border-t border-slate-100 pt-8">
              <h2 className="text-xl font-black text-slate-950">프로젝트 설명</h2>
              <p className="mt-4 whitespace-pre-wrap leading-8 text-slate-700">
                {project.description}
              </p>
            </section>

            <section className="mt-9 border-t border-slate-100 pt-8">
              <h2 className="text-xl font-black text-slate-950">일정</h2>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-sm font-bold text-slate-500">모집 마감</dt>
                  <dd className="mt-2 font-black text-slate-900">
                    {dateFormatter.format(new Date(project.recruitmentDeadline))}
                  </dd>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <dt className="text-sm font-bold text-slate-500">작업 기간</dt>
                  <dd className="mt-2 font-black text-slate-900">
                    {dateFormatter.format(new Date(project.workStartAt))} ~{' '}
                    {dateFormatter.format(new Date(project.workEndAt))}
                  </dd>
                </div>
              </dl>
            </section>
          </article>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">예상 예산</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {currencyFormatter.format(project.budget)}원
            </p>
            <div className="mt-6 flex items-start gap-3 border-t border-slate-100 pt-5">
              <BriefcaseBusiness className="mt-0.5 size-5 text-brand-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-slate-400">의뢰인</p>
                <p className="mt-1 font-black text-slate-800">{clientName}</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-5 text-brand-600" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-slate-400">등록일</p>
                <p className="mt-1 font-bold text-slate-700">
                  {dateFormatter.format(new Date(project.createdAt))}
                </p>
              </div>
            </div>

            <div className="mt-6">
              {!user ? (
                <Link
                  className="block rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white"
                  to="/login"
                >
                  로그인하고 참여하기
                </Link>
              ) : user.role === 'FREELANCER' ? (
                project.myApplication ? (
                  <div className="rounded-xl bg-brand-50 p-4 text-sm text-brand-800" role="status">
                    <p className="font-bold">
                      이미 지원한 프로젝트 · {applicationStatusLabels[project.myApplication.status]}
                    </p>
                    <Link className="mt-2 inline-block underline" to="/applications/me">
                      내 지원 현황 보기
                    </Link>
                  </div>
                ) : project.recruitmentStatus === 'OPEN' ? (
                  <Link
                    className="block rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700"
                    to={`/projects/${project.id}/apply`}
                  >
                    지원하기
                  </Link>
                ) : (
                  <button
                    className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500"
                    disabled
                    type="button"
                  >
                    {project.recruitmentStatus === 'SCHEDULED'
                      ? '모집 시작 전입니다'
                      : '모집이 마감되었습니다'}
                  </button>
                )
              ) : null}
              {canManageProject && (
                <Link
                  className="block rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700"
                  to={`/projects/${project.id}/applications`}
                >
                  지원자 보기
                </Link>
              )}
            </div>
            <BookmarkButton projectId={project.id} isBookmarked={project.isBookmarked} />

            {canManageProject ? (
              <div className="mt-7 grid gap-2 border-t border-slate-100 pt-5">
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:border-brand-300 hover:text-brand-700"
                  to={`/projects/${project.id}/edit`}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  수정하기
                </Link>
                {confirmDelete ? (
                  <div className="rounded-xl bg-rose-50 p-3">
                    <p className="text-sm font-bold text-rose-800">정말 삭제할까요?</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                        disabled={deleteMutation.isPending}
                        onClick={() => void handleDelete()}
                        type="button"
                      >
                        삭제
                      </button>
                      <button
                        className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-600"
                        onClick={() => setConfirmDelete(false)}
                        type="button"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-bold text-rose-700 hover:bg-rose-50"
                    onClick={() => setConfirmDelete(true)}
                    type="button"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    삭제하기
                  </button>
                )}
                {deleteMutation.isError ? (
                  <p className="text-xs font-bold text-rose-700">
                    {getProjectErrorMessage(deleteMutation.error)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
