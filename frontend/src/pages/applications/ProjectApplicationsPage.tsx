import { useState } from 'react';
import { CalendarDays, CircleDollarSign, UserRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AccessNotice } from '@/features/applications/components/AccessNotice';
import { ApplicationStatusBadge } from '@/features/applications/components/ApplicationStatusBadge';
import {
  applicationStatusLabels,
  formatDate,
  formatWon,
  getApplicationErrorMessage,
} from '@/features/applications/format';
import { useDecideApplication, useProjectApplications } from '@/features/applications/hooks';
import type { ApplicationStatus, ProjectApplication } from '@/features/applications/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

type StatusFilter = 'ALL' | ApplicationStatus;

const filters: StatusFilter[] = ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'];

export function ProjectApplicationsPage() {
  const { projectId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const isClient = user?.role === 'CLIENT';
  const applicationsQuery = useProjectApplications(projectId, isClient);
  const decideMutation = useDecideApplication(projectId);
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  if (!user) {
    return (
      <AccessNotice
        title="로그인이 필요합니다"
        description="지원자를 관리하려면 의뢰인 계정으로 로그인해 주세요."
        showLoginLink
      />
    );
  }

  if (!isClient) {
    return (
      <AccessNotice
        title="의뢰인만 볼 수 있는 페이지입니다"
        description="지원자 관리는 프로젝트를 등록한 의뢰인만 할 수 있습니다."
      />
    );
  }

  const applications = applicationsQuery.data ?? [];
  const visible =
    filter === 'ALL' ? applications : applications.filter((item) => item.status === filter);
  const hasAccepted = applications.some((item) => item.status === 'ACCEPTED');

  function decide(application: ProjectApplication, status: 'ACCEPTED' | 'REJECTED') {
    const name = application.freelancer.name ?? '이 지원자';
    const message =
      status === 'ACCEPTED'
        ? `${name}님을 선정할까요?\n선정하면 모집이 마감되고 다른 대기 중인 지원은 자동으로 거절됩니다.`
        : `${name}님의 지원을 거절할까요?`;
    if (!window.confirm(message)) {
      return;
    }
    decideMutation.mutate({ applicationId: application.id, status });
  }

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 sm:px-6">
      <p className="text-sm font-semibold text-brand-600">지원자 관리</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">지원자 목록</h1>
      <p className="mt-3 text-slate-600">
        지원서를 검토하고 함께할 프리랜서 한 명을 선정하세요. 선정 후에는 금액 협의 단계로
        넘어갑니다.
      </p>

      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="지원 상태 필터">
        {filters.map((item) => {
          const count =
            item === 'ALL'
              ? applications.length
              : applications.filter((application) => application.status === item).length;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              onClick={() => setFilter(item)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                filter === item
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
              )}
            >
              {item === 'ALL' ? '전체' : applicationStatusLabels[item]} {count}
            </button>
          );
        })}
      </div>

      {decideMutation.isError ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {getApplicationErrorMessage(decideMutation.error)}
        </p>
      ) : null}

      {applicationsQuery.isPending ? (
        <p className="mt-10 text-slate-500">지원자 목록을 불러오는 중...</p>
      ) : applicationsQuery.isError ? (
        <p className="mt-10 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {getApplicationErrorMessage(applicationsQuery.error)}
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
          {applications.length === 0 ? '아직 지원자가 없습니다.' : '해당 상태의 지원서가 없습니다.'}
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {visible.map((application) => (
            <li
              key={application.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <UserRound className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold">{application.freelancer.name ?? '이름 미등록'}</p>
                    <p className="text-sm text-slate-500">
                      {[
                        application.freelancer.mainCategory,
                        application.freelancer.careerYears !== null
                          ? `경력 ${application.freelancer.careerYears}년`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '프로필 미등록'}
                    </p>
                  </div>
                </div>
                <ApplicationStatusBadge status={application.status} />
              </div>

              <p className="mt-5 whitespace-pre-line text-sm leading-6 text-slate-700">
                {application.introduction}
              </p>

              <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CircleDollarSign className="size-4 text-slate-400" aria-hidden="true" />
                  <dt className="sr-only">제안 금액</dt>
                  <dd className="font-semibold text-slate-900">
                    {formatWon(application.proposedAmount)}
                  </dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-slate-400" aria-hidden="true" />
                  <dt className="sr-only">예상 기간</dt>
                  <dd>{application.estimatedDays}일 예상</dd>
                </div>
                <div>
                  <dt className="sr-only">지원일</dt>
                  <dd>{formatDate(application.createdAt)} 지원</dd>
                </div>
              </dl>

              {application.status === 'PENDING' && !hasAccepted ? (
                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    disabled={decideMutation.isPending}
                    onClick={() => decide(application, 'REJECTED')}
                  >
                    거절
                  </Button>
                  <Button
                    disabled={decideMutation.isPending}
                    onClick={() => decide(application, 'ACCEPTED')}
                  >
                    이 지원자 선정
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
