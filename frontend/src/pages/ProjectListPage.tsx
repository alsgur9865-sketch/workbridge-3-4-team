import { Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { type ProjectRecruitmentStatus, useProjects } from '@/features/projects/projects.api';
import { RecommendedProjects } from '@/features/projects/RecommendedProjects';
import { useAuthStore } from '@/stores/auth.store';

export function ProjectListPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const bookmarkedOnly = searchParams.get('bookmarkedOnly') === 'true';
  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const requestedStatus = searchParams.get('status') ?? (bookmarkedOnly ? '' : 'OPEN');
  const status = (
    ['', 'SCHEDULED', 'OPEN', 'CLOSED'].includes(requestedStatus)
      ? requestedStatus
      : requestedStatus === 'ALL'
        ? ''
        : 'OPEN'
  ) as ProjectRecruitmentStatus | '';
  const skill = searchParams.get('skill') ?? '';
  const minBudget = searchParams.get('minBudget') ?? '';
  const maxBudget = searchParams.get('maxBudget') ?? '';
  const requestedSort = searchParams.get('sort') ?? 'newest';
  const sort = (
    ['newest', 'budgetLow', 'budgetHigh', 'deadline'].includes(requestedSort)
      ? requestedSort
      : 'newest'
  ) as 'newest' | 'budgetLow' | 'budgetHigh' | 'deadline';
  const requestedPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  function updateFilters(
    updates: Record<string, string | null>,
    options: { resetPage?: boolean } = {},
  ) {
    const nextParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) nextParams.set(key, value);
      else nextParams.delete(key);
    }
    if (options.resetPage !== false) nextParams.delete('page');
    setSearchParams(nextParams, { replace: true });
  }
  const projectsQuery = useProjects({
    page,
    limit: 9,
    search: search.trim() || undefined,
    category: category || undefined,
    status: status || undefined,
    skill: skill.trim() || undefined,
    minBudget: minBudget ? Number(minBudget) : undefined,
    maxBudget: maxBudget ? Number(maxBudget) : undefined,
    sort,
    bookmarkedOnly: bookmarkedOnly && Boolean(user),
  });

  const projects = projectsQuery.data?.data ?? [];
  const meta = projectsQuery.data?.meta;

  return (
    <main className="min-h-[70vh] bg-[#f5f5f7]">
      <section className="soft-grid bg-[#f5f5f7]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-14 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-20">
          <div>
            <p className="section-eyebrow">모집 중인 프로젝트</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] text-[#1d1d1f] sm:text-5xl">
              나에게 맞는 프로젝트 찾기
            </h1>
            <p className="mt-3 text-slate-600">
              예산, 일정, 기술을 비교하고 원하는 프로젝트를 확인하세요.
            </p>
          </div>
          {user?.role === 'CLIENT' && (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#0071e3] px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,113,227,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0077ed]"
              to="/projects/new"
            >
              프로젝트 등록하기
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        {user?.role === 'FREELANCER' && !bookmarkedOnly && <RecommendedProjects />}
        {bookmarkedOnly && (
          <div className="mb-6 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <h2 className="text-xl font-black text-slate-900">내 북마크</h2>
            <p className="mt-2 text-sm text-slate-600">
              저장한 프로젝트를 한곳에서 확인하세요. 모집이 끝난 프로젝트도 전체 상태에서 볼 수
              있습니다.
            </p>
          </div>
        )}
        <div className="grid gap-3 rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,0.07)] md:grid-cols-[1fr_12rem_12rem]">
          <label className="relative block">
            <span className="sr-only">프로젝트 검색</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              className="h-12 w-full rounded-xl border border-slate-200 pl-12 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => updateFilters({ search: event.target.value })}
              placeholder="프로젝트명 또는 기술 검색"
              type="search"
              value={search}
            />
          </label>
          <label>
            <span className="sr-only">카테고리 선택</span>
            <select
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => updateFilters({ category: event.target.value })}
              value={category}
            >
              <option value="">전체 카테고리</option>
              <option value="Web Development">웹 개발</option>
              <option value="Design">디자인</option>
            </select>
          </label>
          <label>
            <span className="sr-only">모집 상태 선택</span>
            <select
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => updateFilters({ status: event.target.value || 'ALL' })}
              value={status}
            >
              <option value="">전체 상태</option>
              <option value="OPEN">모집 중</option>
              <option value="SCHEDULED">모집 예정</option>
              <option value="CLOSED">모집 종료</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 rounded-[1.75rem] border border-black/5 bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,0.07)] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_12rem_auto]">
          <label>
            <span className="sr-only">필요 기술</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => updateFilters({ skill: event.target.value })}
              placeholder="기술 필터 (예: React)"
              value={skill}
            />
          </label>
          <label>
            <span className="sr-only">최소 예산</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              min="0"
              onChange={(event) => updateFilters({ minBudget: event.target.value })}
              placeholder="최소 예산"
              type="number"
              value={minBudget}
            />
          </label>
          <label>
            <span className="sr-only">최대 예산</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              min="0"
              onChange={(event) => updateFilters({ maxBudget: event.target.value })}
              placeholder="최대 예산"
              type="number"
              value={maxBudget}
            />
          </label>
          <label>
            <span className="sr-only">정렬 기준</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => updateFilters({ sort: event.target.value })}
              value={sort}
            >
              <option value="newest">최신순</option>
              <option value="deadline">마감 임박순</option>
              <option value="budgetHigh">높은 예산순</option>
              <option value="budgetLow">낮은 예산순</option>
            </select>
          </label>
          <button
            aria-pressed={bookmarkedOnly}
            className={`h-11 rounded-xl border px-4 text-sm font-black transition ${
              bookmarkedOnly
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-brand-300'
            }`}
            onClick={() => {
              if (!user) {
                navigate('/login', { state: { returnTo: '/projects?bookmarkedOnly=true' } });
                return;
              }
              updateFilters({
                bookmarkedOnly: bookmarkedOnly ? null : 'true',
                status: bookmarkedOnly ? null : 'ALL',
              });
            }}
            type="button"
          >
            {bookmarkedOnly ? '전체 프로젝트 보기' : '북마크만 보기'}
          </button>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500" aria-live="polite">
            프로젝트 {meta?.total ?? 0}개
          </p>
        </div>

        {bookmarkedOnly && !user ? (
          <div className="mt-5 rounded-2xl bg-white p-10 text-center">
            <p className="font-bold">로그인하면 저장한 프로젝트를 볼 수 있습니다.</p>
            <Link className="mt-3 inline-block font-bold text-brand-700 underline" to="/login">
              로그인하러 가기
            </Link>
          </div>
        ) : projectsQuery.isPending ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-3" aria-label="프로젝트 불러오는 중">
            {[1, 2, 3].map((item) => (
              <div className="h-80 animate-pulse rounded-2xl bg-slate-200" key={item} />
            ))}
          </div>
        ) : projectsQuery.isError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center">
            <p className="font-bold text-rose-800">프로젝트를 불러오지 못했습니다.</p>
            <button
              className="mt-3 text-sm font-black text-rose-700 underline"
              onClick={() => void projectsQuery.refetch()}
              type="button"
            >
              다시 시도
            </button>
          </div>
        ) : projects.length > 0 ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <Search className="mx-auto size-8 text-slate-400" aria-hidden="true" />
            <p className="mt-4 font-bold text-slate-800">
              {bookmarkedOnly
                ? '현재 조건에 맞는 북마크가 없습니다.'
                : '조건에 맞는 프로젝트가 없습니다.'}
            </p>
            {bookmarkedOnly && (
              <p className="mt-2 text-sm text-slate-600">
                관심 있는 프로젝트의 북마크 버튼을 눌러 저장해 보세요.
              </p>
            )}
            <button
              className="mt-3 text-sm font-bold text-brand-700 hover:underline"
              onClick={() => {
                setSearchParams({}, { replace: true });
              }}
              type="button"
            >
              검색 조건 초기화
            </button>
          </div>
        )}

        {meta && meta.totalPages > 1 ? (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
              disabled={page === 1}
              onClick={() => updateFilters({ page: String(page - 1) }, { resetPage: false })}
              type="button"
            >
              이전
            </button>
            <span className="text-sm font-bold text-slate-600">
              {page} / {meta.totalPages}
            </span>
            <button
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold disabled:opacity-40"
              disabled={page === meta.totalPages}
              onClick={() => updateFilters({ page: String(page + 1) }, { resetPage: false })}
              type="button"
            >
              다음
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
