import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { getAuthErrorMessage, signup } from '@/features/auth/api';
import { useAuthStore } from '@/stores/auth.store';

const signupSchema = z
  .object({
    name: z.string().trim().min(1, '이름을 입력해 주세요.').max(100),
    email: z.string().trim().email('올바른 이메일 주소를 입력해 주세요.'),
    password: z
      .string()
      .min(8, '비밀번호는 8자 이상 입력해 주세요.')
      .max(72, '비밀번호는 72자 이하로 입력해 주세요.'),
    confirmPassword: z.string().min(1, '비밀번호를 한 번 더 입력해 주세요.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: '비밀번호가 서로 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

const inputClassName =
  'mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

export function SignupPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    try {
      await signup({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      navigate('/login', {
        replace: true,
        state: {
          signupCompleted: true,
          email: values.email.trim().toLowerCase(),
        },
      });
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error));
    }
  });

  return (
    <section className="bg-slate-50 px-5 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-md">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <p className="text-sm font-black text-brand-600">무료로 시작하기</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">회원가입</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            기본 계정을 만든 뒤 다음 단계에서 의뢰인 또는 프리랜서 역할을 선택할 수 있습니다.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={onSubmit} noValidate>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="signup-name">
                이름
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                className={inputClassName}
                placeholder="이름 입력"
                aria-invalid={Boolean(errors.name)}
                {...register('name')}
              />
              {errors.name ? (
                <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="signup-email">
                이메일
              </label>
              <input
                id="signup-email"
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
              <label className="text-sm font-bold text-slate-800" htmlFor="signup-password">
                비밀번호
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                className={inputClassName}
                placeholder="8자 이상 입력"
                aria-invalid={Boolean(errors.password)}
                {...register('password')}
              />
              {errors.password ? (
                <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
              ) : null}
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="signup-confirm-password">
                비밀번호 확인
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                autoComplete="new-password"
                className={inputClassName}
                placeholder="비밀번호 다시 입력"
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register('confirmPassword')}
              />
              {errors.confirmPassword ? (
                <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
              ) : null}
            </div>

            {submitError ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {submitError}
              </p>
            ) : null}

            <Button type="submit" className="mt-1 h-12 gap-2 rounded-xl font-bold" disabled={isSubmitting}>
              <UserPlus className="size-4" aria-hidden="true" />
              {isSubmitting ? '가입 중...' : '회원가입'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            이미 계정이 있나요?{' '}
            <Link className="font-bold text-brand-700 hover:underline" to="/login">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
