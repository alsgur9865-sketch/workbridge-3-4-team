import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as authApi from '@/features/auth/api';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RoleSelectionPage } from '@/pages/auth/RoleSelectionPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/features/auth/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/api')>('@/features/auth/api');
  return {
    ...actual,
    login: vi.fn(),
    signup: vi.fn(),
    selectRole: vi.fn(),
    logout: vi.fn(),
  };
});

const api = vi.mocked(authApi);

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'min@example.com',
  name: 'Min',
  role: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().clearSession();
});

describe('LoginPage', () => {
  it('stores the session and sends a roleless user to role selection', async () => {
    api.login.mockResolvedValue({
      accessToken: 'access-token',
      user,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/select-role" element={<p>역할 선택 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'min@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByText('역할 선택 화면')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('shows frontend validation before calling the login API', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    expect(await screen.findByText('올바른 이메일 주소를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });
});

describe('SignupPage', () => {
  it('creates an account and moves to login', async () => {
    api.signup.mockResolvedValue(user);

    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<p>로그인 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('이름'), {
      target: { value: 'Min' },
    });
    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'MIN@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
    await waitFor(() =>
      expect(api.signup).toHaveBeenCalledWith({
        name: 'Min',
        email: 'MIN@example.com',
        password: 'password123',
      }),
    );
  });

  it('rejects mismatched passwords before calling the signup API', async () => {
    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('이름'), {
      target: { value: 'Min' },
    });
    fireEvent.change(screen.getByLabelText('이메일'), {
      target: { value: 'min@example.com' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), {
      target: { value: 'password456' },
    });
    fireEvent.click(screen.getByRole('button', { name: '회원가입' }));

    expect(await screen.findByText('비밀번호가 서로 일치하지 않습니다.')).toBeInTheDocument();
    expect(api.signup).not.toHaveBeenCalled();
  });
});

describe('RoleSelectionPage', () => {
  it('selects a freelancer role, updates Zustand, and moves home', async () => {
    useAuthStore.getState().setSession('old-access-token', user);
    api.selectRole.mockResolvedValue({
      accessToken: 'new-access-token',
      user: { ...user, role: 'FREELANCER' },
    });

    render(
      <MemoryRouter initialEntries={['/select-role']}>
        <Routes>
          <Route path="/select-role" element={<RoleSelectionPage />} />
          <Route path="/" element={<p>홈 화면</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '프리랜서 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '선택 완료' }));

    expect(await screen.findByText('홈 화면')).toBeInTheDocument();
    expect(api.selectRole).toHaveBeenCalledWith('FREELANCER');
    expect(useAuthStore.getState().accessToken).toBe('new-access-token');
    expect(useAuthStore.getState().user?.role).toBe('FREELANCER');
  });
});
