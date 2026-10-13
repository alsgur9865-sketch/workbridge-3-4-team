import { BriefcaseBusiness, ChevronRight, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth.store';

const navigation = [
  { label: '프로젝트 찾기', href: '/projects' },
  { label: '이용 방법', href: '/#how-it-works' },
  { label: 'AI 견적 분석', href: '/#ai-estimate' },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-6 lg:px-8">
          <Link className="flex shrink-0 items-center gap-2.5" to="/" aria-label="WorkBridge 홈">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-200">
              <BriefcaseBusiness className="size-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">WorkBridge</span>
          </Link>

          <nav
            className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex"
            aria-label="주요 메뉴"
          >
            {navigation.map((item) => (
              <a className="transition hover:text-brand-700" href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
            {user && (
              <Link className="hover:text-brand-700" to="/projects?bookmarkedOnly=true">
                내 북마크
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <span className="hidden max-w-40 truncate text-sm font-semibold text-slate-700 sm:inline">
                  {user.name ?? user.email}
                </span>
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
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
                  className="hidden px-3 py-2 text-sm font-semibold text-slate-700 transition hover:text-brand-700 sm:inline-flex"
                  to="/login"
                >
                  로그인
                </Link>
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                  to="/signup"
                >
                  무료로 시작하기
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <Link className="inline-flex items-center gap-2.5 text-white" to="/">
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600">
                <BriefcaseBusiness className="size-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-extrabold">WorkBridge</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              프로젝트 등록부터 지원, 계약, 결제, 납품까지 하나의 흐름으로 연결하는 프리랜서 협업
              플랫폼입니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="font-bold text-white">서비스</p>
              <div className="mt-4 grid gap-3 text-slate-400">
                <a className="hover:text-white" href="/#projects">
                  프로젝트 찾기
                </a>
                <a className="hover:text-white" href="/#how-it-works">
                  이용 방법
                </a>
                <a className="hover:text-white" href="/#ai-estimate">
                  AI 견적 분석
                </a>
              </div>
            </div>
            <div>
              <p className="font-bold text-white">시작하기</p>
              <div className="mt-4 grid gap-3 text-slate-400">
                <Link className="hover:text-white" to="/signup">
                  회원가입
                </Link>
                {user?.role === 'CLIENT' && (
                  <Link className="hover:text-white" to="/projects/new">
                    프로젝트 등록
                  </Link>
                )}
                <Link className="inline-flex items-center gap-1 hover:text-white" to="/login">
                  로그인 <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="mx-auto max-w-7xl px-5 py-5 text-xs text-slate-500 sm:px-6 lg:px-8">
            © 2026 WorkBridge. 팀 프로젝트 MVP.
          </div>
        </div>
      </footer>
    </div>
  );
}
