import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.role) {
      navigate('/select-role', { replace: true });
      return;
    }

    navigate('/', { replace: true });
  }, [navigate, user]);

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-900">
          Google 로그인을 완료하는 중...
        </p>

        <p className="mt-2 text-sm text-slate-500">
          잠시만 기다려 주세요.
        </p>
      </div>
    </section>
  );
}