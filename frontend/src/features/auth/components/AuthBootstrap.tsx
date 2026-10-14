import { useEffect, type PropsWithChildren } from 'react';
import { restoreSession } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export function AuthBootstrap({ children }: PropsWithChildren) {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const finishInitialization = useAuthStore((state) => state.finishInitialization);

  useEffect(() => {
    let active = true;

    restoreSession().finally(() => {
      if (active) {
        finishInitialization();
      }
    });

    return () => {
      active = false;
    };
  }, [finishInitialization]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
        <p className="text-sm font-semibold text-slate-500" role="status">
          로그인 상태를 확인하는 중...
        </p>
      </div>
    );
  }

  return children;
}
