import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export type NotificationType =
  | 'NEW_APPLICATION'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_AUTO_REJECTED'
  | 'PROJECT_CLOSED'
  | 'PRICE_OFFERED'
  | 'PRICE_OFFER_ACCEPTED'
  | 'PRICE_OFFER_REJECTED'
  | 'CONTRACT_SIGN_REQUEST'
  | 'CONTRACT_SIGNED'
  | 'PAYMENT_COMPLETED'
  | 'DELIVERY_SUBMITTED'
  | 'PROJECT_COMPLETED'
  | 'REVIEW_REQUEST';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  targetUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

interface ApiResponse<T> {
  success: true;
  data: T;
}

const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

export function useNotifications() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<NotificationItem[]>>('/notifications');
      return response.data.data;
    },
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });
}

export function useUnreadNotificationCount() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ count: number }>>(
        '/notifications/unread-count',
      );
      return response.data.data.count;
    },
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });
}

export function useReadNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.patch<ApiResponse<NotificationItem>>(
        `/notifications/${notificationId}/read`,
      );
      return response.data.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationItem[]>(notificationKeys.list(), (current) =>
        current?.map((notification) =>
          notification.id === updated.id ? updated : notification,
        ),
      );
      void queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount() });
    },
  });
}

export function useReadAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch<ApiResponse<{ updatedCount: number }>>(
        '/notifications/read-all',
      );
      return response.data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
