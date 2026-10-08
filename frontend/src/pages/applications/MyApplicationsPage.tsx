import { CheckCircle2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AccessNotice } from '@/features/applications/components/AccessNotice';
import { ApplicationStatusBadge } from '@/features/applications/components/ApplicationStatusBadge';
import { formatDate, formatWon, getApplicationErrorMessage } from '@/features/applications/format';
import { useMyApplications } from '@/features/applications/hooks';
import { useAuthStore } from '@/stores/auth.store';

export function MyApplicationsPage() {
  const location = useLocation();
  const justApplied = (location.state as { applied?: boolean } | null)?.applied === true;
  const user = useAuthStore((state) => state.user);
  const isFreelancer = user?.role === 'FREELANCER';
  const applicationsQuery = useMyApplications(isFreelancer);

  if (!user) {
    return (
      <AccessNotice
        title="로그인이 필요합니다"
        description="내 지원 현황을 보려면 프리랜서 계정으로 로그인해 주세요."
        showLoginLink
      />
    );
  }

  if (!isFreelancer) {
    return (
      <AccessNotice
        title="프리랜서만 볼 수 있는 페이지입니다"
        description="지원 현황은 프리랜서 역할의 계정에서 확인할 수 있습니다."
      />
    );
  }

  const applications = applicationsQuery.data ?? [];

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6">
      <p className="text-sm font-semibold text-brand-600">마이페이지</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">내 지원 현황</h1>

      {justApplied ? (
        <p
          className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
          role="status"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          지원서가 제출되었습니다. 의뢰인이 검토 후 결과를 알려드립니다.
        </p>
      ) : null}

      {applicationsQuery.isPending ? (
        <p className="mt-10 text-slate-500">지원 현황을 불러오는 중...</p>
      ) : applicationsQuery.isError ? (
        <p className="mt-10 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {getApplicationErrorMessage(applicationsQuery.error)}
        </p>
      ) : applications.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
          <p className="text-slate-500">아직 지원한 프로젝트가 없습니다.</p>
          <Link className="mt-4 inline-block font-semibold text-brand-600 hover:underline" to="/">
            프로젝트 둘러보기
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4">
          {applications.map((application) => (
            <li
              key={application.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link
                  className="text-lg font-bold hover:text-brand-700"
                  to={`/projects/${application.project.id}`}
                >
                  {application.project.title}
                </Link>
                <ApplicationStatusBadge status={application.status} />
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">프로젝트 예산</dt>
                  <dd className="mt-1 font-semibold">{formatWon(application.project.budget)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">내 제안 금액</dt>
                  <dd className="mt-1 font-semibold">{formatWon(application.proposedAmount)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">지원일</dt>
                  <dd className="mt-1 font-semibold">{formatDate(application.createdAt)}</dd>
                </div>
              </dl>

              {application.status === 'ACCEPTED' ? (
                <p className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
                  선정되었습니다! 의뢰인과 최종 금액 협의를 진행해 주세요.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
