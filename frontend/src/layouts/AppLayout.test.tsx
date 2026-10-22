import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/features/auth/api', () => ({ logout: vi.fn() }));
vi.mock('@/features/notifications/api', () => ({
  useUnreadNotificationCount: () => ({ data: 0 }),
}));

describe('AppLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(window.performance, 'getEntriesByType', {
      configurable: true,
      value: vi.fn(() => []),
    });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
  });

  it('opens a new route at the top of the page', () => {
    render(
      <MemoryRouter initialEntries={['/projects/project-1']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="projects/:projectId" element={<p>프로젝트 상세</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  it('opens a refreshed hash route at the top instead of restoring the middle section', () => {
    vi.mocked(window.performance.getEntriesByType).mockReturnValue([
      { type: 'reload' } as PerformanceNavigationTiming,
    ]);

    render(
      <MemoryRouter initialEntries={['/#how-it-works']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div id="how-it-works">이용 방법</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
  });

  it('exposes the main navigation from the mobile menu', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<p>홈</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '메뉴 열기' }));

    const navigation = screen.getByRole('navigation', { name: '모바일 주요 메뉴' });
    expect(navigation).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: '프로젝트 찾기' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'AI 견적 분석' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '메뉴 닫기' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'AI 견적 받아보기' })).not.toBeInTheDocument();
  });

  it('offers AI estimation without duplicating the action on its own page', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="projects" element={<p>프로젝트 목록</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'AI 견적 받아보기' })).toHaveAttribute(
      'href',
      '/projects/price-estimate',
    );

    unmount();

    render(
      <MemoryRouter initialEntries={['/projects/price-estimate']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="projects/price-estimate" element={<p>AI 견적 분석</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'AI 견적 받아보기' })).not.toBeInTheDocument();
  });

  it('reveals the AI action after the home hero has scrolled away', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<p>홈</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'AI 견적 받아보기' })).not.toBeInTheDocument();

    window.scrollY = 600;
    fireEvent.scroll(window);

    expect(screen.getByRole('link', { name: 'AI 견적 받아보기' })).toBeInTheDocument();
  });
});
