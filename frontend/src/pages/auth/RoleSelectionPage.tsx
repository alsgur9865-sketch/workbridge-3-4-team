import { BriefcaseBusiness, Code2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  getAuthErrorMessage,
  selectRole,
  type UserRole,
} from '@/features/auth/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const roleOptions: Array<{
  role: UserRole;
  title: string;
  description: string;
  icon: typeof BriefcaseBusiness;
}> = [
  {
    role: 'CLIENT',
    title: '의뢰인',
    description: '프로젝트를 등록하고 지원자를 비교해 함께할 프리랜서를 찾습니다.',
    icon: BriefcaseBusiness,
  },
  {
    role: 'FREELANCER',
    title: '프리랜서',
    description: '내 역량에 맞는 프로젝트를 찾고 지원해 새로운 일을 시작합니다.',
    icon: Code2,
  },
];

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit() {
    if (!selectedRole || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const session = await selectRole(selectedRole);
      setSession(session.accessToken, session.user);
      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="bg-slate-50 px-5 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="text-sm font-black text-brand-600">마지막 한 단계</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            어떤 목적으로 WorkBridge를 이용하시나요?
          </h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
            선택한 역할에 맞춰 프로젝트와 기능을 보여드릴게요. 역할은 가입 후 한 번만 선택합니다.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {roleOptions.map((option) => {
            const Icon = option.icon;
            const selected = selectedRole === option.role;

            return (
              <button
                key={option.role}
                type="button"
                aria-pressed={selected}
                aria-label={`${option.title} 선택`}
                className={cn(
                  'rounded-3xl border bg-white p-7 text-left shadow-sm transition',
                  selected
                    ? 'border-brand-500 ring-4 ring-brand-100'
                    : 'border-slate-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg',
                )}
                onClick={() => setSelectedRole(option.role)}
              >
                <span
                  className={cn(
                    'flex size-12 items-center justify-center rounded-2xl',
                    selected ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700',
                  )}
                >
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-black text-slate-950">{option.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{option.description}</p>
              </button>
            );
          })}
        </div>

        {submitError ? (
          <p
            className="mx-auto mt-6 max-w-xl rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700"
            role="alert"
          >
            {submitError}
          </p>
        ) : null}

        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            className="h-12 min-w-44 rounded-xl font-bold"
            disabled={!selectedRole || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? '역할 저장 중...' : '선택 완료'}
          </Button>
        </div>
      </div>
    </section>
  );
}
