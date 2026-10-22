import { Bell, BriefcaseBusiness, ChevronRight, LogOut, Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '@/features/auth/api';
import { useUnreadNotificationCount } from '@/features/notifications/api';
import { useAuthStore } from '@/stores/auth.store';

const navigation = [
  { label: '프로젝트 찾기', href: '/projects' },
  { label: '이용 방법', href: '/#how-it-works' },
  { label: 'AI 견적 분석', href: '/#ai-estimate' },
];

function wasPageReloaded() {
  const navigationEntry = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  return navigationEntry?.type === 'reload';
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const unreadCountQuery = useUnreadNotificationCount();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);
  const initialLocationKeyRef = useRef(location.key);
  const pageWasReloadedRef = useRef(wasPageReloaded());

  useLayoutEffect(() => {
    const isReloadedInitialLocation =
      pageWasReloadedRef.current && location.key === initialLocationKeyRef.current;

    if (location.hash && !isReloadedInitialLocation) {
      const frame = window.requestAnimationFrame(() => {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: 'start' });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.hash, location.key, location.pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (location.pathname !== '/') return;

    const updateFloatingAction = () => {
      const threshold = Math.min(window.innerHeight * 0.55, 520);
      setHasScrolledPastHero(window.scrollY > threshold);
    };

    updateFloatingAction();
    window.addEventListener('scroll', updateFloatingAction, { passive: true });
    return () => window.removeEventListener('scroll', updateFloatingAction);
  }, [location.pathname]);

  if (user && user.role === null && location.pathname !== '/select-role') {
    return <Navigate to="/select-role" replace />;
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      clearSession();
      setIsLoggingOut(false);
      navigate('/');
    }
  }

  const unreadCount = unreadCountQuery.data ?? 0;
  const showAiEstimateButton =
    location.pathname !== '/projects/price-estimate' &&
    !isMobileMenuOpen &&
    (location.pathname !== '/' || hasScrolledPastHero);

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 shadow-[0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-6 lg:px-8">
          <Link className="flex shrink-0 items-center gap-2.5" to="/" aria-label="WorkBridge 홈">
            <span className="flex size-8 items-center justify-center rounded-[0.7rem] bg-[#1d1d1f] text-white shadow-sm">
              <BriefcaseBusiness className="size-4" aria-hidden="true" />
            </span>
            <span className="text-[1.05rem] font-extrabold tracking-[-0.025em]">WorkBridge</span>
          </Link>

          <nav
            className="hidden items-center gap-8 text-[0.82rem] font-semibold text-[#424245] md:flex"
            aria-label="주요 메뉴"
          >
            {navigation.map((item) => (
              <a className="transition hover:text-[#0071e3]" href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
            {user && (
              <Link className="hover:text-[#0071e3]" to="/projects?bookmarkedOnly=true">
                내 북마크
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <Link
                  className="relative inline-flex size-9 items-center justify-center rounded-full border border-black/10 bg-white/80 text-slate-700 transition hover:border-black/20 hover:bg-[#f5f5f7]"
                  to="/notifications"
                  aria-label={unreadCount > 0 ? `알림 ${unreadCount}개 안 읽음` : '알림'}
                >
                  <Bell className="size-4" aria-hidden="true" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black leading-4 text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </Link>
                <Link
                  className="hidden max-w-40 truncate text-sm font-semibold text-slate-700 hover:text-[#0071e3] sm:inline"
                  to="/profile"
                >
                  {user.name ?? user.email}
                </Link>
                <button
                  type="button"
                  className="hidden h-9 items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white/80 px-3.5 text-sm font-bold text-slate-700 transition hover:border-black/20 hover:bg-[#f5f5f7] disabled:opacity-50 sm:inline-flex"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {isLoggingOut ? '로그아웃 중' : '로그아웃'}
                </button>
              </>
            ) : (
              <>
                <Link
                  className="hidden px-3 py-2 text-sm font-semibold text-slate-700 transition hover:text-[#0071e3] sm:inline-flex"
                  to="/login"
                >
                  로그인
                </Link>
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-full bg-[#0071e3] px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,113,227,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0077ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2"
                  to="/signup"
                >
                  <span className="hidden sm:inline">무료로&nbsp;</span>시작하기
                </Link>
              </>
            )}
            <button
              aria-controls="mobile-navigation"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              className="inline-flex size-9 items-center justify-center rounded-full border border-black/10 bg-white text-slate-700 transition hover:bg-[#f5f5f7] md:hidden"
              onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
              type="button"
            >
              {isMobileMenuOpen ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                <Menu className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen ? (
          <div
            className="border-t border-black/5 bg-white/95 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:hidden"
            id="mobile-navigation"
          >
            <nav className="mx-auto grid max-w-7xl gap-1" aria-label="모바일 주요 메뉴">
              {navigation.map((item) => (
                <a
                  className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-[#f5f5f7] hover:text-[#0071e3]"
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </a>
              ))}
              {user ? (
                <>
                  <Link
                    className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#f5f5f7]"
                    to="/projects?bookmarkedOnly=true"
                  >
                    내 북마크
                  </Link>
                  <Link
                    className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#f5f5f7]"
                    to="/profile"
                  >
                    내 프로필
                  </Link>
                  <button
                    className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-black/10 px-4 py-3 text-left text-sm font-bold text-slate-700"
                    disabled={isLoggingOut}
                    onClick={() => void handleLogout()}
                    type="button"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    {isLoggingOut ? '로그아웃 중' : '로그아웃'}
                  </button>
                </>
              ) : (
                <Link
                  className="rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-[#f5f5f7]"
                  to="/login"
                >
                  로그인
                </Link>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-black/5 bg-[#f5f5f7] text-[#424245]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <Link className="inline-flex items-center gap-2.5 text-[#1d1d1f]" to="/">
              <span className="flex size-8 items-center justify-center rounded-[0.7rem] bg-[#1d1d1f] text-white">
                <BriefcaseBusiness className="size-4" aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold tracking-tight">WorkBridge</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-[#6e6e73]">
              프로젝트 등록부터 지원, 계약, 결제, 납품까지 하나의 흐름으로 연결하는 프리랜서 협업
              플랫폼입니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-bold text-[#1d1d1f]">서비스</p>
              <div className="mt-4 grid gap-3 text-[#6e6e73]">
                <a className="hover:text-[#0071e3]" href="/#projects">
                  프로젝트 찾기
                </a>
                <a className="hover:text-[#0071e3]" href="/#how-it-works">
                  이용 방법
                </a>
                <a className="hover:text-[#0071e3]" href="/#ai-estimate">
                  AI 견적 분석
                </a>
              </div>
            </div>
            <div>
              <p className="font-bold text-[#1d1d1f]">시작하기</p>
              <div className="mt-4 grid gap-3 text-[#6e6e73]">
                <Link className="hover:text-[#0071e3]" to="/signup">
                  회원가입
                </Link>
                {user ? (
                  <>
                    <Link className="hover:text-[#0071e3]" to="/profile">
                      내 프로필
                    </Link>
                    <Link className="hover:text-[#0071e3]" to="/notifications">
                      알림
                    </Link>
                  </>
                ) : null}
                {user?.role === 'CLIENT' && (
                  <Link className="hover:text-[#0071e3]" to="/projects/new">
                    프로젝트 등록
                  </Link>
                )}
                <Link className="inline-flex items-center gap-1 hover:text-[#0071e3]" to="/login">
                  로그인 <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-black/5">
          <div className="mx-auto max-w-7xl px-5 py-5 text-xs text-[#86868b] sm:px-6 lg:px-8">
            © 2026 WorkBridge. 팀 프로젝트 MVP.
          </div>
        </div>
      </footer>

      {showAiEstimateButton ? (
        <Link
          aria-label="AI 견적 받아보기"
          className="hero-enter hero-enter-2 group fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-[#1d1d1f] px-3.5 pr-4 text-sm font-black text-white shadow-[0_16px_45px_rgba(15,23,42,0.28)] transition duration-300 hover:-translate-y-1 hover:bg-[#0071e3] hover:shadow-[0_20px_55px_rgba(0,113,227,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 sm:bottom-10 sm:right-10 sm:h-14 sm:gap-3 sm:px-4 sm:pr-5"
          to="/projects/price-estimate"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-white/12 sm:size-8">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span className="sm:hidden">AI 견적</span>
          <span className="hidden sm:inline">AI 견적 받아보기</span>
          <ChevronRight
            className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      ) : null}
    </div>
  );
}
