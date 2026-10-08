import { useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Handshake,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FeaturedProject {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  duration: string;
  deadline: string;
  skills: string[];
}

const featuredProjects: FeaturedProject[] = [
  {
    id: 'matching-dashboard',
    title: '프리랜서 매칭 대시보드 구축',
    description: '의뢰인과 프리랜서가 프로젝트 진행 상황을 한눈에 관리하는 반응형 대시보드',
    category: '웹 개발',
    budget: 5_000_000,
    duration: '약 6주',
    deadline: 'D-10',
    skills: ['React', 'TypeScript', 'Node.js'],
  },
  {
    id: 'b2b-landing-page',
    title: 'B2B 랜딩 페이지 리디자인',
    description: '서비스 핵심 가치를 명확하게 전달하는 정보 구조와 반응형 랜딩 페이지 개선',
    category: '디자인',
    budget: 2_200_000,
    duration: '약 3주',
    deadline: 'D-8',
    skills: ['Figma', 'React', 'UI/UX'],
  },
  {
    id: 'reservation-web-app',
    title: '소상공인 예약 관리 웹앱 개발',
    description: '모바일 예약 접수와 일정 관리를 지원하는 관리자 중심의 웹 애플리케이션',
    category: '웹 개발',
    budget: 3_800_000,
    duration: '약 5주',
    deadline: 'D-14',
    skills: ['React', 'Express', 'PostgreSQL'],
  },
];

const workflowSteps = ['프로젝트 등록', '지원자 선택', '계약 · 안전결제', '작업 · 납품'];

const benefits = [
  {
    icon: Handshake,
    title: '조건에 맞는 연결',
    description: '기술, 예산, 일정에 맞는 프로젝트와 전문가를 빠르게 찾을 수 있습니다.',
  },
  {
    icon: ShieldCheck,
    title: '안전한 거래 과정',
    description: '금액 협의부터 계약, 결제, 납품 승인까지 단계별로 관리합니다.',
  },
  {
    icon: Star,
    title: '신뢰를 쌓는 리뷰',
    description: '프로젝트 완료 후 상호 리뷰를 남겨 다음 협업의 판단 기준을 만듭니다.',
  },
];

const journeys = [
  {
    eyebrow: '프로젝트를 의뢰한다면',
    title: '필요한 전문가를 찾고 싶어요',
    description: '프로젝트 조건을 등록하고 지원자를 비교해 가장 잘 맞는 파트너를 선택하세요.',
    icon: BriefcaseBusiness,
    accent: 'bg-brand-600',
    steps: ['프로젝트 등록', '지원자 비교', '계약 · 결제'],
    cta: '프로젝트 등록하기',
    to: '/projects/new',
  },
  {
    eyebrow: '프로젝트를 찾는다면',
    title: '내 역량에 맞는 일을 찾고 싶어요',
    description: '프로필과 기술을 등록하고 원하는 조건의 프로젝트에 바로 지원하세요.',
    icon: Users,
    accent: 'bg-emerald-600',
    steps: ['프로필 작성', '프로젝트 탐색', '지원 · 협업'],
    cta: '프로젝트 둘러보기',
    to: '/#projects',
  },
];

const currencyFormatter = new Intl.NumberFormat('ko-KR');

export function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredProjects = featuredProjects.filter((project) => {
    const matchesCategory = selectedCategory === '전체' || project.category === selectedCategory;
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [project.title, project.description, ...project.skills]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="overflow-hidden bg-white">
      <section className="relative isolate border-b border-slate-100 bg-slate-50">
        <div
          className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,0.16),transparent_36%),radial-gradient(circle_at_10%_70%,rgba(16,185,129,0.10),transparent_30%)]"
          aria-hidden="true"
        />
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-18 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3.5 py-2 text-sm font-bold text-brand-700 shadow-sm">
              <Sparkles className="size-4" aria-hidden="true" />
              의뢰부터 완료까지, 하나의 워크플로
            </div>
            <h1 className="mt-6 max-w-3xl text-3xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl">
              프로젝트와 전문가를
              <span className="block text-brand-600">더 정확하게 연결합니다</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              검증된 프리랜서를 찾고, 나에게 맞는 프로젝트에 지원하세요. 계약부터 결제, 납품까지
              WorkBridge에서 안전하게 진행할 수 있습니다.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-base font-bold text-white shadow-lg shadow-brand-200 transition hover:-translate-y-0.5 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                href="#projects"
              >
                프로젝트 찾기
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <Link
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-base font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                to="/projects/new"
              >
                프로젝트 등록하기
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-slate-600">
              {['계약 · 결제 · 납품 통합', '역할별 맞춤 프로필', '프로젝트 완료 후 상호 리뷰'].map(
                (item) => (
                  <span className="inline-flex items-center gap-2" key={item}>
                    <Check className="size-4 text-emerald-600" strokeWidth={3} aria-hidden="true" />
                    {item}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/50 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-sm font-bold text-slate-500">진행 중인 협업</p>
                  <p className="mt-1 font-extrabold text-slate-950">브랜드 웹사이트 리뉴얼</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  계약 진행 중
                </span>
              </div>

              <div className="mt-6 grid gap-4">
                {workflowSteps.map((step, index) => {
                  const completed = index < 2;
                  return (
                    <div
                      className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      key={step}
                    >
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                          completed
                            ? 'bg-brand-600 text-white'
                            : 'border-2 border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        {completed ? (
                          <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-900">{step}</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {completed ? '완료된 단계입니다' : '다음 단계에서 진행됩니다'}
                        </p>
                      </div>
                      <ChevronRight className="size-5 text-slate-300" aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="absolute -bottom-8 -left-3 hidden w-58 rounded-2xl border border-brand-100 bg-white p-4 shadow-xl sm:block lg:-left-10">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Sparkles className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold text-brand-700">AI 견적 분석 예시</p>
                  <p className="mt-1 font-black text-slate-950">적정 범위 확인</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24" id="projects">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-600">
              Open projects
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              지금 참여할 수 있는 프로젝트
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              예산과 일정, 필요한 기술을 확인하고 내 경험과 잘 맞는 프로젝트를 찾아보세요.
            </p>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 font-bold text-brand-700 hover:text-brand-800"
            to="/projects"
          >
            전체 프로젝트 보기
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm sm:grid-cols-[1fr_12rem] sm:p-4">
          <label className="relative block">
            <span className="sr-only">프로젝트 검색</span>
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="프로젝트명 또는 기술 검색"
              type="search"
              value={searchTerm}
            />
          </label>
          <label>
            <span className="sr-only">카테고리 선택</span>
            <select
              className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
              onChange={(event) => setSelectedCategory(event.target.value)}
              value={selectedCategory}
            >
              <option>전체</option>
              <option>웹 개발</option>
              <option>디자인</option>
            </select>
          </label>
        </div>

        <p className="mt-5 text-sm font-semibold text-slate-500" aria-live="polite">
          샘플 프로젝트 {filteredProjects.length}개
        </p>

        {filteredProjects.length > 0 ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
            <Search className="mx-auto size-8 text-slate-400" aria-hidden="true" />
            <p className="mt-4 font-bold text-slate-800">조건에 맞는 샘플 프로젝트가 없습니다.</p>
            <button
              className="mt-3 text-sm font-bold text-brand-700 hover:underline"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('전체');
              }}
              type="button"
            >
              검색 조건 초기화
            </button>
          </div>
        )}
      </section>

      <section className="border-y border-slate-200 bg-slate-50" id="how-it-works">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-600">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              역할에 맞게 시작하세요
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-7 text-slate-600">
              의뢰인과 프리랜서가 각자의 목적에 집중할 수 있도록 필요한 흐름을 나눴습니다.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {journeys.map((journey) => (
              <JourneyCard journey={journey} key={journey.eyebrow} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-600">
            Safer collaboration
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            협업의 모든 단계를 더 투명하게
          </h2>
          <p className="mt-3 leading-7 text-slate-600">
            지원 이후의 금액 협의와 계약, 결제, 납품 상태를 한곳에서 확인할 수 있습니다.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                key={benefit.title}
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-black text-slate-950">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-6 lg:px-8 lg:pb-24" id="ai-estimate">
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-14">
          <div
            className="absolute -right-24 -top-24 size-64 rounded-full bg-brand-500/25 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-brand-100">
                <Sparkles className="size-4" aria-hidden="true" />
                AI 가격 분석 · 2차 스프린트 예정
              </span>
              <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                프로젝트 예산이 고민되시나요?
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-slate-300">
                프로젝트 설명과 기간, 필요한 기술을 바탕으로 적정 예상 금액의 범위를 분석하는 기능을
                준비하고 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <CircleDollarSign className="size-6 text-brand-300" aria-hidden="true" />
                <div>
                  <p className="text-sm font-bold text-slate-300">AI 예상 견적</p>
                  <p className="text-lg font-black">기능 준비 중</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-brand-100 bg-brand-50">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-5 py-14 sm:px-6 md:flex-row md:items-center lg:px-8">
          <div>
            <p className="text-sm font-black text-brand-700">
              새로운 협업을 시작할 준비가 되셨나요?
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              WorkBridge에서 프로젝트와 전문가를 만나보세요.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition hover:bg-brand-700"
              to="/signup"
            >
              무료로 시작하기
            </Link>
            <a
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-200 bg-white px-5 text-sm font-bold text-brand-800 transition hover:border-brand-400"
              href="#projects"
            >
              프로젝트 둘러보기
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProjectCard({ project }: { project: FeaturedProject }) {
  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-slate-200/70">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          모집 중
        </span>
        <span className="text-xs font-bold text-slate-500">{project.category}</span>
      </div>

      <h3 className="mt-5 text-xl font-black leading-7 text-slate-950 transition group-hover:text-brand-700">
        {project.title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {project.skills.map((skill) => (
          <span
            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
            key={skill}
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 text-sm">
        <div>
          <p className="text-xs font-semibold text-slate-400">예상 예산</p>
          <p className="mt-1 font-black text-slate-900">
            {currencyFormatter.format(project.budget)}원
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400">작업 기간</p>
          <p className="mt-1 flex items-center gap-1.5 font-bold text-slate-700">
            <Clock3 className="size-4 text-slate-400" aria-hidden="true" />
            {project.duration}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">
          <CalendarDays className="size-4" aria-hidden="true" />
          모집 마감 {project.deadline}
        </span>
        <Link
          className="inline-flex items-center gap-1 text-sm font-black text-brand-700"
          to={`/projects/${project.id}`}
        >
          자세히 보기
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function JourneyCard({ journey }: { journey: (typeof journeys)[number] }) {
  const Icon = journey.icon;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <span
          className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-white ${journey.accent}`}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-black text-brand-700">{journey.eyebrow}</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {journey.title}
          </h3>
        </div>
      </div>

      <p className="mt-5 leading-7 text-slate-600">{journey.description}</p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {journey.steps.map((step, index) => (
          <li className="rounded-xl bg-slate-50 p-3" key={step}>
            <span className="text-xs font-black text-brand-600">0{index + 1}</span>
            <p className="mt-1 text-sm font-bold text-slate-800">{step}</p>
          </li>
        ))}
      </ol>

      <Link
        className="mt-6 inline-flex items-center gap-1.5 font-black text-brand-700 hover:text-brand-800"
        to={journey.to}
      >
        {journey.cta}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  );
}
