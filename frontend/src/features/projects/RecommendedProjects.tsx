import { Sparkles } from 'lucide-react';
import { ProjectCard } from './ProjectCard';
import { useRecommendedProjects } from './projects.api';

export function RecommendedProjects() {
  const query = useRecommendedProjects();
  return (
    <section
      className="mb-10 rounded-3xl border border-brand-100 bg-brand-50/50 p-5 sm:p-7"
      aria-labelledby="recommended-title"
    >
      <h2
        id="recommended-title"
        className="flex items-center gap-2 text-2xl font-black text-slate-950"
      >
        <Sparkles className="size-6 text-brand-600" aria-hidden="true" /> 나를 위한 추천 프로젝트
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        내 기술과 주 분야에 맞는 모집 중 프로젝트입니다. 같은 조건이면 최근 등록 순으로 보여드려요.
      </p>
      {query.isPending ? (
        <p className="mt-6 text-slate-600" role="status">
          추천 프로젝트를 찾고 있습니다.
        </p>
      ) : query.isError ? (
        <div className="mt-6" role="alert">
          <p>추천 프로젝트를 불러오지 못했습니다.</p>
          <button
            className="mt-2 font-bold text-brand-700 underline"
            onClick={() => void query.refetch()}
            type="button"
          >
            추천 다시 불러오기
          </button>
        </div>
      ) : query.data?.meta.profileRequired ? (
        <p className="mt-6 rounded-xl bg-white p-5 text-slate-700">
          프로필에 주 분야나 기술스택을 등록하면 맞춤 추천을 받을 수 있어요.
        </p>
      ) : query.data?.data.length ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {query.data.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-white p-5 text-slate-700">
          아직 내 기술·분야에 맞는 모집 중 프로젝트가 없습니다. 아래 전체 목록도 살펴보세요.
        </p>
      )}
    </section>
  );
}
