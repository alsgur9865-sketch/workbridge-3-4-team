import { render, screen } from '@testing-library/react';
import { restoreSession } from '@/lib/api-client';
import { AuthBootstrap } from '@/features/auth/components/AuthBootstrap';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/lib/api-client', () => ({
  restoreSession: vi.fn(),
}));

const restoreSessionMock = vi.mocked(restoreSession);

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    accessToken: null,
    user: null,
    isInitialized: false,
  });
});

describe('AuthBootstrap', () => {
  it('restores the refresh-token session before rendering the app', async () => {
    restoreSessionMock.mockResolvedValue(true);

    render(
      <AuthBootstrap>
        <p>앱 화면</p>
      </AuthBootstrap>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('로그인 상태를 확인하는 중...');
    expect(await screen.findByText('앱 화면')).toBeInTheDocument();
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('still renders the app when there is no refresh session', async () => {
    restoreSessionMock.mockResolvedValue(false);

    render(
      <AuthBootstrap>
        <p>비회원 화면</p>
      </AuthBootstrap>,
    );

    expect(await screen.findByText('비회원 화면')).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
