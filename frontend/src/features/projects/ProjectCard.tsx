import { CalendarDays, ChevronRight, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Project } from '@/features/projects/projects.api';
import { formatProjectCategory } from '@/features/projects/format';
import { BookmarkButton } from './BookmarkButton';

const currencyFormatter = new Intl.NumberFormat('ko-KR');

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
  if (new Date(deadline).getTime() <= Date.now()) return '마감';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return '마감';
  if (days === 0) return 'D-Day';
  return `D-${days}`;
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group relative flex h-full flex-col rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition duration-500 ease-out hover:-translate-y-1.5 hover:border-blue-100 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            project.recruitmentStatus === 'OPEN'
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
              : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
          }`}
        >
          {statusLabels[project.recruitmentStatus]}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            {formatProjectCategory(project.category)}
          </span>
          <div className="relative z-10">
            <BookmarkButton projectId={project.id} isBookmarked={project.isBookmarked} compact />
          </div>
        </div>
      </div>

      <h3 className="mt-6 break-keep text-xl font-black leading-7 tracking-[-0.025em] text-[#1d1d1f] transition [overflow-wrap:anywhere] group-hover:text-[#0071e3]">
        <Link
          className="after:absolute after:inset-0 after:rounded-[1.75rem] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#0071e3] focus-visible:after:ring-offset-2"
          to={`/projects/${project.id}`}
        >
          {project.title}
        </Link>
      </h3>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6e6e73]">{project.description}</p>

      {project.recommendation && (
        <p className="mt-3 text-sm font-bold text-[#0071e3]">
          {[
            project.recommendation.matchedSkills.length > 0
              ? `기술 ${project.recommendation.matchedSkills.length}개 일치: ${project.recommendation.matchedSkills.join(', ')}`
              : '',
            project.recommendation.categoryMatched ? '주 분야 일치' : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {project.skills.map((skill) => (
          <span
            className="rounded-full bg-[#f5f5f7] px-3 py-1.5 text-xs font-bold text-slate-600"
            key={skill}
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-black/5 pt-5 text-sm">
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
        <span className="flex size-8 items-center justify-center rounded-full bg-[#f5f5f7] text-[#0071e3] transition duration-300 group-hover:translate-x-1 group-hover:bg-blue-50">
          <ChevronRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
