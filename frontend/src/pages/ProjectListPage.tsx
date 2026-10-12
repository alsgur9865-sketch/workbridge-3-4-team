import { Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { type ProjectRecruitmentStatus, useProjects } from '@/features/projects/projects.api';

export function ProjectListPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<ProjectRecruitmentStatus | ''>('OPEN');
  const [skill, setSkill] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const [sort, setSort] = useState<'newest' | 'budgetLow' | 'budgetHigh' | 'deadline'>('newest');
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [page, setPage] = useState(1);
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
    bookmarkedOnly,
  });

  const projects = projectsQuery.data?.data ?? [];
  const meta = projectsQuery.data?.meta;

  return (
    <main className="min-h-[70vh] bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-12 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-600">
              Projects
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              나에게 맞는 프로젝트 찾기
            </h1>
            <p className="mt-3 text-slate-600">
              예산, 일정, 기술을 비교하고 원하는 프로젝트를 확인하세요.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700"
            to="/projects/new"
          >
            프로젝트 등록하기
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_12rem_12rem]">
          <label className="relative block">
            <span className="sr-only">프로젝트 검색</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              className="h-12 w-full rounded-xl border border-slate-200 pl-12 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="프로젝트명 또는 기술 검색"
              type="search"
              value={search}
            />
          </label>
          <label>
            <span className="sr-only">카테고리 선택</span>
            <select
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
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
              onChange={(event) => {
                setStatus(event.target.value as ProjectRecruitmentStatus | '');
                setPage(1);
              }}
              value={status}
            >
              <option value="">전체 상태</option>
              <option value="OPEN">모집 중</option>
              <option value="SCHEDULED">모집 예정</option>
              <option value="CLOSED">모집 종료</option>
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_12rem_auto]">
          <label>
            <span className="sr-only">필요 기술</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => {
                setSkill(event.target.value);
                setPage(1);
              }}
              placeholder="기술 필터 (예: React)"
              value={skill}
            />
          </label>
          <label>
            <span className="sr-only">최소 예산</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              min="0"
              onChange={(event) => {
                setMinBudget(event.target.value);
                setPage(1);
              }}
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
              onChange={(event) => {
                setMaxBudget(event.target.value);
                setPage(1);
              }}
              placeholder="최대 예산"
              type="number"
              value={maxBudget}
            />
          </label>
          <label>
            <span className="sr-only">정렬 기준</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => {
                setSort(event.target.value as typeof sort);
                setPage(1);
              }}
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
              setBookmarkedOnly((current) => !current);
              setPage(1);
            }}
            type="button"
          >
            북마크만 보기
          </button>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500" aria-live="polite">
            프로젝트 {meta?.total ?? 0}개
          </p>
        </div>

        {projectsQuery.isPending ? (
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
            <p className="mt-4 font-bold text-slate-800">조건에 맞는 프로젝트가 없습니다.</p>
            <button
              className="mt-3 text-sm font-bold text-brand-700 hover:underline"
              onClick={() => {
                setSearch('');
                setCategory('');
                setStatus('OPEN');
                setSkill('');
                setMinBudget('');
                setMaxBudget('');
                setSort('newest');
                setBookmarkedOnly(false);
                setPage(1);
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
              onClick={() => setPage((current) => current - 1)}
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
              onClick={() => setPage((current) => current + 1)}
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
