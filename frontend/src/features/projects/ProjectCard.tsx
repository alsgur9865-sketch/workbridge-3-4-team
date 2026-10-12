import { Bookmark, CalendarDays, ChevronRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type Project, useToggleBookmark } from '@/features/projects/projects.api';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

const categoryLabels: Record<string, string> = {
  'Web Development': '웹 개발',
  Design: '디자인',
};

const statusLabels = {
  SCHEDULED: '모집 예정',
  OPEN: '모집 중',
  CLOSED: '모집 종료',
} as const;

function formatDuration(startAt: string, endAt: string) {
  const days = Math.max(
    1,
    Math.ceil((new Date(endAt).getTime() - new Date(startAt).getTime()) / 86_400_000),
  );
  return days >= 14 ? `약 ${Math.ceil(days / 7)}주` : `약 ${days}일`;
}

function formatDeadline(deadline: string) {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return '마감';
  if (days === 0) return 'D-Day';
  return `D-${days}`;
}

export function ProjectCard({ project }: { project: Project }) {
  const bookmarkMutation = useToggleBookmark(project.id, project.isBookmarked);

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-slate-200/70">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            project.recruitmentStatus === 'OPEN'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {statusLabels[project.recruitmentStatus]}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            {categoryLabels[project.category] ?? project.category}
          </span>
          <button
            aria-label={project.isBookmarked ? '북마크 해제' : '북마크 추가'}
            className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-brand-300 hover:text-brand-700 disabled:opacity-50"
            disabled={bookmarkMutation.isPending}
            onClick={() => bookmarkMutation.mutate()}
            type="button"
          >
            <Bookmark
              className={`size-4 ${project.isBookmarked ? 'fill-brand-600 text-brand-600' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      <h3 className="mt-5 text-xl font-black leading-7 text-slate-950 transition group-hover:text-brand-700">
        {project.title}
      </h3>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{project.description}</p>

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

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 text-sm">
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
            {formatDuration(project.workStartAt, project.workEndAt)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">
          <CalendarDays className="size-4" aria-hidden="true" />
          모집 마감 {formatDeadline(project.recruitmentDeadline)}
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
