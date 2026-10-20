import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  Search,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ProjectCard } from '@/features/projects/ProjectCard';
import { useProjects } from '@/features/projects/projects.api';
import { useReviewHighlights } from '@/features/reviews/api';
import { useAuthStore } from '@/stores/auth.store';

const serviceSteps = [
  {
    title: '가입과 역할 설정',
    description: '의뢰인 또는 프리랜서 역할을 선택하고 협업에 필요한 정보를 준비합니다.',
  },
  {
    title: '프로젝트와 파트너 연결',
    description: '프로젝트를 등록하거나 탐색하고 지원자와 조건을 비교해 파트너를 선택합니다.',
  },
  {
    title: '계약·결제·납품·리뷰',
    description: '합의한 조건으로 계약하고 결제와 납품 승인을 거쳐 협업 리뷰를 남깁니다.',
  },
];

const projectCategories = [
  { label: '전체', value: '전체' },
  { label: '웹 개발', value: 'Web Development' },
  { label: '디자인', value: 'Design' },
] as const;

const journeys = {
  CLIENT: {
    eyebrow: '의뢰인을 위해',
    title: '필요한 전문가를 찾으세요.',
    description: '프로젝트 조건을 등록하고 지원자를 비교해 가장 잘 맞는 파트너를 선택하세요.',
    icon: BriefcaseBusiness,
    accent: 'bg-[#0071e3]',
    glow: 'from-blue-500/15 to-cyan-400/10',
    steps: ['프로젝트 등록', '지원자 비교', '금액 합의 · 계약', '납품 승인 · 리뷰'],
    cta: '프로젝트 등록하기',
    to: '/projects/new',
  },
  FREELANCER: {
    eyebrow: '프리랜서를 위해',
    title: '내 역량에 맞는 일을 만나세요.',
    description: '프로필과 기술을 등록하고 원하는 조건의 프로젝트에 바로 지원하세요.',
    icon: Users,
    accent: 'bg-[#1d1d1f]',
    glow: 'from-violet-500/15 to-blue-500/10',
    steps: ['프로필 작성', '프로젝트 탐색 · 지원', '금액 합의 · 계약', '작업 · 납품 · 리뷰'],
    cta: '프로젝트 둘러보기',
    to: '/#projects',
  },
};

type JourneyRole = keyof typeof journeys;

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const searchTerm = searchParams.get('search') ?? '';
  const requestedCategory = searchParams.get('category') ?? '전체';
  const selectedCategory = projectCategories.some(
    (category) => category.value === requestedCategory,
  )
    ? (requestedCategory as (typeof projectCategories)[number]['value'])
    : '전체';
  const [selectedJourneyRole, setSelectedJourneyRole] = useState<JourneyRole>(
    user?.role === 'FREELANCER' ? 'FREELANCER' : 'CLIENT',
  );
  const projectsQuery = useProjects({
    limit: 3,
    search: searchTerm.trim() || undefined,
    category: selectedCategory === '전체' ? undefined : selectedCategory,
    status: 'OPEN',
  });
  const reviewHighlightsQuery = useReviewHighlights();
  const projects = projectsQuery.data?.data ?? [];
  const reviewHighlights = reviewHighlightsQuery.data;
  const hasProjectFilters = searchTerm.trim().length > 0 || selectedCategory !== '전체';

  function updateProjectFilters(next: { search?: string; category?: string }) {
    const updatedParams = new URLSearchParams(location.search);
    const nextSearch = next.search ?? searchTerm;
    const nextCategory = next.category ?? selectedCategory;

    if (nextSearch.trim()) updatedParams.set('search', nextSearch);
    else updatedParams.delete('search');

    if (nextCategory !== '전체') updatedParams.set('category', nextCategory);
    else updatedParams.delete('category');

    const query = updatedParams.toString();
    navigate(
      { pathname: '/', search: query ? `?${query}` : '', hash: '#projects' },
      { replace: true },
    );
  }

  return (
    <div className="overflow-hidden bg-white text-[#1d1d1f]">
      <section className="soft-grid relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-[#f5f5f7]">
        <div className="hero-orb hero-orb-left" aria-hidden="true" />
        <div className="hero-orb hero-orb-right" aria-hidden="true" />
        <div className="hero-ambient-glow" aria-hidden="true" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-16 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="hero-enter hero-enter-1 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
            <Sparkles className="size-4 text-[#0071e3]" aria-hidden="true" />더 단순하고, 더 안전한
            협업
          </div>

          <h1
            className="hero-enter hero-enter-2 mx-auto mt-7 max-w-6xl text-[2.1rem] font-black leading-[1.04] tracking-[-0.055em] text-[#1d1d1f] sm:text-[2.2rem] md:text-[2.9rem] lg:text-[3.5rem] xl:text-[4.5rem]"
            aria-label="좋은 프로젝트와 좋은 전문가가 더 쉽게 만나는 곳."
          >
            <span className="block lg:whitespace-nowrap">좋은 프로젝트와 좋은 전문가가</span>
            <span className="gradient-text block whitespace-nowrap">더 쉽게 만나는 곳.</span>
          </h1>

          <p className="hero-enter hero-enter-3 mx-auto mt-7 max-w-2xl break-keep text-lg leading-8 text-[#6e6e73] sm:text-xl">
            탐색부터 계약, 결제, 납품까지. 복잡했던 프리랜서 협업을 WorkBridge 하나로 간결하게
            연결합니다.
          </p>

          <div className="hero-enter hero-enter-4 mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {user?.role === 'CLIENT' ? (
              <Link className="primary-pill group" to="/projects/new">
                프로젝트 등록하기
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            ) : user?.role === 'FREELANCER' ? (
              <a className="primary-pill group" href="#projects">
                프로젝트 찾기
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </a>
            ) : (
              <Link className="primary-pill group" to="/signup">
                무료로 시작하기
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            )}
            {user?.role !== 'FREELANCER' && (
              <a className="text-link group" href="#projects">
                프로젝트 먼저 둘러보기
                <ChevronRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </a>
            )}
          </div>

          <div className="hero-enter hero-enter-5 mt-9 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-semibold text-[#6e6e73]">
            {['계약 · 결제 · 납품 통합', '역할별 맞춤 경험', '완료 후 상호 리뷰'].map((item) => (
              <span className="inline-flex items-center gap-2" key={item}>
                <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <a className="hero-scroll-cue" href="#projects" aria-label="프로젝트 보기">
          <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </section>

      <section className="bg-white" id="projects">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-eyebrow">모집 중인 프로젝트</p>
                <h2 className="section-title mt-3">지금 시작할 수 있는 프로젝트.</h2>
                <p className="section-copy mt-4">
                  예산과 일정, 필요한 기술을 한눈에 비교하고 내 경험과 잘 맞는 일을 찾아보세요.
                </p>
              </div>
              <Link className="text-link group" to="/projects">
                전체 프로젝트 보기
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-10 grid gap-3 rounded-[1.5rem] bg-[#f5f5f7] p-3 sm:grid-cols-[1fr_auto] sm:p-4">
              <label className="relative block">
                <span className="sr-only">프로젝트 검색</span>
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  className="h-13 w-full rounded-2xl border border-transparent bg-white pl-12 pr-4 text-sm font-medium shadow-sm outline-none transition duration-300 placeholder:text-slate-400 hover:shadow-md focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  onChange={(event) => updateProjectFilters({ search: event.target.value })}
                  placeholder="프로젝트명 또는 기술 검색"
                  type="search"
                  value={searchTerm}
                />
              </label>
              <div
                className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-1.5 shadow-sm"
                aria-label="인기 카테고리"
                role="group"
              >
                {projectCategories.map((category) => {
                  const isSelected = selectedCategory === category.value;
                  return (
                    <button
                      className={`h-10 rounded-xl px-4 text-sm font-bold transition duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                        isSelected
                          ? 'bg-[#1d1d1f] text-white shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      aria-pressed={isSelected}
                      key={category.value}
                      onClick={() => updateProjectFilters({ category: category.value })}
                      type="button"
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <p className="mt-6 text-sm font-semibold text-[#6e6e73]" aria-live="polite">
            프로젝트 {projectsQuery.data?.meta.total ?? 0}개
          </p>

          {projectsQuery.isPending ? (
            <div className="mt-4 grid gap-5 lg:grid-cols-3" aria-label="프로젝트 불러오는 중">
              {[1, 2, 3].map((item) => (
                <div className="h-80 animate-pulse rounded-[1.75rem] bg-slate-100" key={item} />
              ))}
            </div>
          ) : projectsQuery.isError ? (
            <div className="mt-4 rounded-[1.75rem] border border-rose-100 bg-rose-50 px-6 py-14 text-center">
              <p className="font-bold text-rose-800">프로젝트를 불러오지 못했습니다.</p>
              <button
                className="mt-3 text-sm font-bold text-rose-700 hover:underline"
                onClick={() => void projectsQuery.refetch()}
                type="button"
              >
                다시 시도
              </button>
            </div>
          ) : projects.length > 0 ? (
            <div className="mt-4 grid gap-5 lg:grid-cols-3">
              {projects.map((project, index) => (
                <Reveal delay={index * 80} key={project.id}>
                  <ProjectCard project={project} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.75rem] border border-dashed border-slate-300 bg-[#f5f5f7] px-6 py-14 text-center">
              <Search className="mx-auto size-8 text-slate-400" aria-hidden="true" />
              <p className="mt-4 font-bold text-slate-800">
                {hasProjectFilters
                  ? '조건에 맞는 프로젝트가 없습니다.'
                  : '현재 모집 중인 프로젝트가 없습니다.'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {hasProjectFilters
                  ? '검색어나 카테고리를 바꿔 다시 확인해 보세요.'
                  : '새 프로젝트가 등록되면 이곳에서 바로 확인할 수 있습니다.'}
              </p>
              {hasProjectFilters ? (
                <button
                  className="mt-4 text-sm font-bold text-[#0071e3] hover:underline"
                  onClick={() => {
                    navigate({ pathname: '/', hash: '#projects' }, { replace: true });
                  }}
                  type="button"
                >
                  검색 조건 초기화
                </button>
              ) : user?.role === 'CLIENT' ? (
                <Link className="primary-pill mt-5" to="/projects/new">
                  새 프로젝트 등록하기
                </Link>
              ) : (
                <Link className="primary-pill mt-5" to="/projects">
                  전체 프로젝트 확인하기
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#f5f5f7]" id="how-it-works">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <Reveal className="text-center">
            <p className="section-eyebrow">이용 방법</p>
            <h2 className="section-title section-title-nowrap mx-auto mt-3">
              <span className="inline-block">역할은 달라도,</span>{' '}
              <span className="inline-block">과정은 매끄럽게.</span>
            </h2>
            <p className="section-copy mx-auto mt-4">
              의뢰인과 프리랜서가 각자의 목적에 집중하도록 필요한 흐름만 선명하게 나눴습니다.
            </p>
          </Reveal>

          <Reveal delay={60}>
            <div className="mt-10 rounded-[2rem] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] ring-1 ring-black/5 sm:p-7">
              <div className="flex flex-col gap-2 text-left sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black text-[#0071e3]">전체 이용 흐름</p>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-[#1d1d1f]">
                    가입부터 리뷰까지, 세 단계로 이해하세요.
                  </h3>
                </div>
                <p className="max-w-md text-sm leading-6 text-[#6e6e73]">
                  각 단계의 상태가 연결되어 있어 지금 해야 할 일과 다음 순서를 놓치지 않습니다.
                </p>
              </div>

              <ol className="mt-7 grid gap-3 md:grid-cols-3">
                {serviceSteps.map((step, index) => (
                  <li className="relative rounded-2xl bg-[#f5f5f7] p-5 text-left" key={step.title}>
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#0071e3] text-xs font-black text-white shadow-md shadow-blue-500/20">
                      {index + 1}
                    </span>
                    <h4 className="mt-4 font-black text-slate-900">{step.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>

          <Reveal className="mt-10 text-center" delay={100}>
            <p className="section-eyebrow">역할별 이용 순서</p>
            <p className="section-copy mx-auto mt-3">
              의뢰인과 프리랜서에게 필요한 화면과 행동을 역할에 맞게 구분했습니다.
            </p>
            <div className="mt-5 flex justify-center">
              <div
                className="inline-flex rounded-full bg-slate-200/80 p-1"
                aria-label="역할별 이용 순서 선택"
                role="tablist"
              >
                {(
                  [
                    ['CLIENT', '의뢰인'],
                    ['FREELANCER', '프리랜서'],
                  ] as const
                ).map(([role, label]) => {
                  const isSelected = selectedJourneyRole === role;
                  return (
                    <button
                      className={`min-w-28 rounded-full px-5 py-2.5 text-sm font-black transition duration-300 focus:outline-none focus:ring-4 focus:ring-blue-100 ${
                        isSelected
                          ? 'bg-white text-[#1d1d1f] shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                      aria-controls="journey-panel"
                      aria-selected={isSelected}
                      id={`journey-tab-${role.toLowerCase()}`}
                      key={role}
                      onClick={() => setSelectedJourneyRole(role)}
                      role="tab"
                      type="button"
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <Reveal className="mx-auto mt-5 max-w-4xl" delay={140}>
            <div
              aria-labelledby={`journey-tab-${selectedJourneyRole.toLowerCase()}`}
              id="journey-panel"
              role="tabpanel"
            >
              <JourneyCard journey={journeys[selectedJourneyRole]} />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <Reveal className="max-w-3xl">
            <p className="section-eyebrow">안전한 협업</p>
            <h2 className="section-title section-title-nowrap mx-auto mt-3">
              협업의 모든 단계를 더 투명하게.
            </h2>
            <p className="section-copy mt-4">
              지원 이후의 금액 협의와 계약, 결제, 납품 상태를 한곳에서 확인할 수 있습니다.
            </p>
          </Reveal>

          {reviewHighlightsQuery.isPending ? (
            <div className="mt-10 grid animate-pulse gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="h-72 rounded-[2rem] bg-slate-100" />
              <div className="h-72 rounded-[2rem] bg-slate-100" />
            </div>
          ) : reviewHighlights && reviewHighlights.reviewCount > 0 ? (
            <div className="mt-10 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
              <Reveal>
                <div className="h-full rounded-[2rem] bg-[#1d1d1f] p-7 text-white sm:p-9">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-black text-blue-300">완료된 협업 데이터</p>
                    {reviewHighlights.includesDemoData && (
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/60">
                        데모 데이터 포함
                      </span>
                    )}
                  </div>
                  <dl className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    <Metric
                      label="완료 프로젝트"
                      value={`${reviewHighlights.completedProjectCount}건`}
                    />
                    <Metric
                      label="평균 평점"
                      value={
                        reviewHighlights.averageRating === null
                          ? '평가 전'
                          : `${reviewHighlights.averageRating.toFixed(1)} / 5`
                      }
                    />
                    <Metric label="등록 리뷰" value={`${reviewHighlights.reviewCount}개`} />
                  </dl>
                </div>
              </Reveal>

              <div className="grid gap-4 md:grid-cols-2">
                {reviewHighlights.reviews.slice(0, 2).map((review, index) => (
                  <Reveal delay={index * 80} key={review.id}>
                    <article className="interactive-card h-full rounded-[1.75rem] border border-black/5 bg-[#f5f5f7] p-7">
                      <div
                        className="flex gap-1 text-amber-400"
                        aria-label={`평점 ${review.rating}점`}
                      >
                        {Array.from({ length: 5 }, (_, starIndex) => (
                          <Star
                            className={`size-4 ${starIndex < review.rating ? 'fill-current' : 'text-slate-300'}`}
                            key={starIndex}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <p className="mt-5 line-clamp-4 leading-7 text-slate-700">
                        “{review.content}”
                      </p>
                      <div className="mt-6 border-t border-black/5 pt-5">
                        <Link
                          className="font-black text-[#1d1d1f] hover:text-[#0071e3]"
                          to={`/projects/${review.project.id}`}
                        >
                          {review.project.title}
                        </Link>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {review.reviewerRole === 'CLIENT' ? '의뢰인 작성' : '프리랜서 작성'}
                          {review.isDemo ? ' · 데모' : ''}
                        </p>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          ) : (
            <Reveal delay={80}>
              <div className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-[#f5f5f7] px-6 py-10 text-center">
                <Star className="mx-auto size-8 text-slate-400" aria-hidden="true" />
                <p className="mt-4 font-black text-slate-800">아직 완료된 협업 리뷰가 없습니다.</p>
                <p className="mt-2 text-sm text-slate-500">
                  첫 프로젝트가 완료되면 실제 평점과 리뷰가 이곳에 자동으로 표시됩니다.
                </p>
              </div>
            </Reveal>
          )}

          <Reveal delay={260}>
            <div className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-black/5 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black text-[#1d1d1f]">기록으로 확인하는 협업 과정</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#6e6e73]">
                {['계약 상태 기록', '결제 진행 확인', '납품·승인 이력'].map((item) => (
                  <li className="inline-flex items-center gap-2" key={item}>
                    <Check className="size-4 text-emerald-500" strokeWidth={3} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-white px-5 pb-20 sm:px-6 lg:px-8 lg:pb-24" id="ai-estimate">
        <Reveal className="mx-auto max-w-7xl">
          <div className="ai-panel relative overflow-hidden rounded-[2.25rem] bg-[#1d1d1f] px-7 py-14 text-white sm:px-12 sm:py-16 lg:px-16 lg:py-20">
            <div className="ai-glow" aria-hidden="true" />
            <div className="relative grid gap-12 lg:grid-cols-[1fr_22rem] lg:items-end">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-blue-100 ring-1 ring-white/10 backdrop-blur">
                  <Sparkles className="size-4" aria-hidden="true" />
                  AI 가격 분석
                </span>
                <h2 className="mt-7 max-w-3xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                  막연했던 예산을,
                  <span className="block text-blue-300">데이터로 더 명확하게.</span>
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">
                  프로젝트 설명과 기간, 필요한 기술을 바탕으로 적정 예상 금액과 판단 근거를
                  확인하세요.
                </p>
              </div>

              <div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-blue-200">분석 결과 예시</p>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white/55">
                      예시 데이터
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-bold text-white/65">브랜드 홈페이지 리뉴얼</p>
                  <p className="mt-1 text-3xl font-black tracking-[-0.03em] text-white">
                    350만~520만원
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold text-white/55">
                    <span className="rounded-xl bg-black/15 px-3 py-2">예상 기간 6주</span>
                    <span className="rounded-xl bg-black/15 px-3 py-2">React · Figma</span>
                  </div>
                </div>

                <Link className="ai-action group mt-3 w-full" to="/projects/price-estimate">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
                    <CircleDollarSign className="size-6" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-xs font-bold text-white/45">AI 예상 견적</span>
                    <span className="mt-1 flex items-center gap-2 font-black">
                      바로 분석하기
                      <ArrowRight
                        className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="border-t border-black/5 bg-[#f5f5f7]">
        <Reveal className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <p className="text-sm font-bold text-[#0071e3]">
              새로운 협업을 시작할 준비가 되셨나요?
            </p>
            <h2 className="cta-title-nowrap mt-2 max-w-2xl text-3xl font-black tracking-[-0.035em] text-[#1d1d1f] sm:text-4xl">
              다음 프로젝트를 WorkBridge에서 만나보세요.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link className="primary-pill" to="/signup">
              무료로 시작하기
            </Link>
            <a className="secondary-pill" href="#projects">
              프로젝트 둘러보기
            </a>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

function JourneyCard({ journey }: { journey: (typeof journeys)[JourneyRole] }) {
  const Icon = journey.icon;

  return (
    <article className="interactive-card group relative h-full overflow-hidden rounded-[2rem] border border-white/80 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:p-9">
      <div
        className={`absolute inset-x-0 top-0 h-48 bg-gradient-to-b ${journey.glow} to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
        aria-hidden="true"
      />
      <div className="relative">
        <div className="flex items-start gap-4">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${journey.accent}`}
          >
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0071e3]">
              {journey.eyebrow}
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#1d1d1f] sm:text-3xl">
              {journey.title}
            </h3>
          </div>
        </div>

        <p className="mt-6 leading-7 text-[#6e6e73]">{journey.description}</p>

        <ol className="mt-7 grid gap-3 sm:grid-cols-2">
          {journey.steps.map((step, index) => (
            <li className="rounded-2xl bg-[#f5f5f7] p-4" key={step}>
              <span className="text-xs font-black text-[#0071e3]">0{index + 1}</span>
              <p className="mt-2 text-sm font-bold text-slate-800">{step}</p>
            </li>
          ))}
        </ol>

        <Link className="text-link group/link mt-7" to={journey.to}>
          {journey.cta}
          <ArrowRight
            className="size-4 transition-transform duration-300 group-hover/link:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] px-5 py-4 ring-1 ring-white/10">
      <dt className="text-xs font-bold text-white/45">{label}</dt>
      <dd className="mt-1 text-2xl font-black tracking-[-0.03em]">{value}</dd>
    </div>
  );
}

function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (!('IntersectionObserver' in window)) {
      element.dataset.visible = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        element.dataset.visible = 'true';
        observer.unobserve(element);
      },
      { rootMargin: '0px 0px -60px', threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`reveal ${className}`}
      ref={elementRef}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}
