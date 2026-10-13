import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as notificationApi from '@/features/notifications/api';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/features/notifications/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/notifications/api')>(
    '@/features/notifications/api',
  );

  return {
    ...actual,
    useNotifications: vi.fn(),
    useReadNotification: vi.fn(),
    useReadAllNotifications: vi.fn(),
  };
});

const api = vi.mocked(notificationApi);
const readMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
};
const readAllMutation = {
  mutate: vi.fn(),
  isPending: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/notifications']}>
        <Routes>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/projects/1" element={<p>프로젝트 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession('token', {
    id: 'user-1',
    email: 'min@example.com',
    name: 'Min',
    role: 'CLIENT',
  });
  api.useReadNotification.mockReturnValue(readMutation as never);
  api.useReadAllNotifications.mockReturnValue(readAllMutation as never);
});

describe('NotificationsPage', () => {
  it('shows notifications and marks an unread item before navigating', async () => {
    api.useNotifications.mockReturnValue({
      data: [
        {
          id: 'notification-1',
          userId: 'user-1',
          type: 'NEW_APPLICATION',
          title: '새 지원자가 있습니다.',
          message: '프로젝트에 새로운 지원자가 있습니다.',
          targetUrl: '/projects/1',
          readAt: null,
          createdAt: '2026-10-13T00:00:00.000Z',
        },
      ],
      isPending: false,
      isError: false,
    } as never);
    readMutation.mutateAsync.mockResolvedValue({
      id: 'notification-1',
      readAt: '2026-10-13T01:00:00.000Z',
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /새 지원자가 있습니다/ }));

    await waitFor(() => {
      expect(readMutation.mutateAsync).toHaveBeenCalledWith('notification-1');
      expect(screen.getByText('프로젝트 화면')).toBeInTheDocument();
    });
  });

  it('marks all unread notifications as read', () => {
    api.useNotifications.mockReturnValue({
      data: [
        {
          id: 'notification-1',
          userId: 'user-1',
          type: 'NEW_APPLICATION',
          title: '새 지원자가 있습니다.',
          message: '프로젝트에 새로운 지원자가 있습니다.',
          targetUrl: null,
          readAt: null,
          createdAt: '2026-10-13T00:00:00.000Z',
        },
      ],
      isPending: false,
      isError: false,
    } as never);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '모두 읽음' }));
    expect(readAllMutation.mutate).toHaveBeenCalled();
  });
});
