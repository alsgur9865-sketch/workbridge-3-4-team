import { Bell, CheckCheck, Circle } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  type NotificationItem,
  useNotifications,
  useReadAllNotifications,
  useReadNotification,
} from '@/features/notifications/api';
import { useAuthStore } from '@/stores/auth.store';

const typeLabels: Record<NotificationItem['type'], string> = {
  NEW_APPLICATION: '새 지원',
  APPLICATION_ACCEPTED: '지원 수락',
  APPLICATION_REJECTED: '지원 거절',
  APPLICATION_AUTO_REJECTED: '지원 자동 거절',
  PROJECT_CLOSED: '프로젝트 마감',
  PRICE_OFFERED: '금액 제안',
  PRICE_OFFER_ACCEPTED: '금액 수락',
  PRICE_OFFER_REJECTED: '금액 거절',
  CONTRACT_SIGN_REQUEST: '계약 서명 요청',
  CONTRACT_SIGNED: '계약 체결',
  PAYMENT_COMPLETED: '결제 완료',
  DELIVERY_SUBMITTED: '결과물 제출',
  PROJECT_COMPLETED: '프로젝트 완료',
  REVIEW_REQUEST: '리뷰 요청',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function NotificationsPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const notificationsQuery = useNotifications();
  const readMutation = useReadNotification();
  const readAllMutation = useReadAllNotifications();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  async function openNotification(notification: NotificationItem) {
    if (!notification.readAt) {
      try {
        await readMutation.mutateAsync(notification.id);
      } catch {
        return;
      }
    }

    if (notification.targetUrl) {
      navigate(notification.targetUrl);
    }
  }

  return (
    <main className="min-h-[70vh] bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-600">
              Notifications
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">알림</h1>
            <p className="mt-2 text-slate-600">
              지원, 금액 협의, 계약, 결제 등 주요 진행 상황을 확인합니다.
            </p>
          </div>

          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={unreadCount === 0 || readAllMutation.isPending}
            onClick={() => readAllMutation.mutate()}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            모두 읽음
          </button>
        </div>

        {notificationsQuery.isPending ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            알림을 불러오는 중...
          </div>
        ) : null}

        {notificationsQuery.isError ? (
          <div className="mt-8 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
            <p className="font-bold text-rose-700">알림을 불러오지 못했습니다.</p>
            <button
              className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white"
              type="button"
              onClick={() => void notificationsQuery.refetch()}
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {!notificationsQuery.isPending &&
        !notificationsQuery.isError &&
        notifications.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <Bell className="mx-auto size-9 text-slate-300" aria-hidden="true" />
            <p className="mt-4 font-bold text-slate-700">아직 알림이 없습니다.</p>
          </div>
        ) : null}

        {notifications.length > 0 ? (
          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;

              return (
                <button
                  key={notification.id}
                  className={`flex w-full items-start gap-4 border-b border-slate-100 px-5 py-5 text-left transition last:border-b-0 hover:bg-slate-50 sm:px-6 ${
                    isUnread ? 'bg-brand-50/50' : 'bg-white'
                  }`}
                  type="button"
                  onClick={() => void openNotification(notification)}
                >
                  <span className="mt-1">
                    <Circle
                      className={`size-2.5 ${
                        isUnread ? 'fill-brand-600 text-brand-600' : 'fill-slate-200 text-slate-200'
                      }`}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {typeLabels[notification.type]}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        {formatDate(notification.createdAt)}
                      </span>
                    </span>
                    <span className="mt-2 block font-black text-slate-900">
                      {notification.title}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">
                      {notification.message}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}
