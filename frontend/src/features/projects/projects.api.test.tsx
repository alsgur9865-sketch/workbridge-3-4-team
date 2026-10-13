import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { useProjects } from './projects.api';

vi.mock('@/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

it('does not reuse the previous account bookmark data when switching accounts', async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const firstResponse = { data: [{ id: 'first-user-bookmark', isBookmarked: true }] };
  let resolveSecond: (value: { data: { data: [] } }) => void = () => {};
  vi.mocked(apiClient.get)
    .mockResolvedValueOnce({ data: firstResponse })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
    );
  useAuthStore.setState({
    user: { id: 'first-user', email: 'first@example.com', name: null, role: 'FREELANCER' },
  });
  const { result, unmount } = renderHook(() => useProjects({ bookmarkedOnly: true }), { wrapper });
  await waitFor(() => expect(result.current.data).toEqual(firstResponse));

  act(() =>
    useAuthStore.setState({
      user: { id: 'second-user', email: 'second@example.com', name: null, role: 'FREELANCER' },
    }),
  );
  expect(result.current.data).toBeUndefined();
  await act(async () => resolveSecond({ data: { data: [] } }));
  await waitFor(() => expect(result.current.data?.data).toEqual([]));
  unmount();
  queryClient.clear();
  useAuthStore.getState().clearSession();
});
