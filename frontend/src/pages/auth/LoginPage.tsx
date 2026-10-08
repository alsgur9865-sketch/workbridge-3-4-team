import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { getAuthErrorMessage, login } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth.store';

const loginSchema = z.object({
  email: z.string().trim().email('올바른 이메일 주소를 입력해 주세요.'),
  password: z.string().min(1, '비밀번호를 입력해 주세요.').max(72),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginLocationState {
  signupCompleted?: boolean;
  email?: string;
}

const inputClassName =
  'mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const state = location.state as LoginLocationState | null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: state?.email ?? '',
      password: '',
    },
  });

  if (user) {
    return <Navigate to={user.role ? '/' : '/select-role'} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      const session = await login(values);
      setSession(session.accessToken, session.user);
      navigate(session.user.role ? '/' : '/select-role', { replace: true });
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error));
    }
  });

  return (
    <section className="bg-slate-50 px-5 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <p className="text-sm font-black text-brand-600">다시 만나서 반가워요</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">로그인</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            WorkBridge 계정으로 로그인하고 프로젝트와 지원 현황을 관리하세요.
          </p>

          {state?.signupCompleted ? (
            <p
              className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
              role="status"
            >
              회원가입이 완료되었습니다. 방금 만든 계정으로 로그인해 주세요.
            </p>
          ) : null}

          <form className="mt-8 grid gap-5" onSubmit={onSubmit} noValidate>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="login-email">
                이메일
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className={inputClassName}
                placeholder="name@example.com"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email ? (
                <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="login-password">
                비밀번호
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className={inputClassName}
                placeholder="비밀번호 입력"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              {errors.password ? (
                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
              ) : null}
            </div>

            {submitError ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {submitError}
              </p>
            ) : null}

            <Button type="submit" className="mt-1 h-12 gap-2 rounded-xl font-bold" disabled={isSubmitting}>
              <LogIn className="size-4" aria-hidden="true" />
              {isSubmitting ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            아직 계정이 없나요?{' '}
            <Link className="font-bold text-brand-700 hover:underline" to="/signup">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
