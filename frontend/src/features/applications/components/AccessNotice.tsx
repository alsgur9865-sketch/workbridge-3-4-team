import { LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AccessNoticeProps {
  title: string;
  description: string;
  showLoginLink?: boolean;
}

export function AccessNotice({ title, description, showLoginLink = false }: AccessNoticeProps) {
  return (
    <section className="mx-auto max-w-xl px-5 py-24 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <LockKeyhole className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-slate-600">{description}</p>
      {showLoginLink ? (
        <Link
          className="mt-8 inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white hover:bg-brand-700"
          to="/login"
        >
          로그인하러 가기
        </Link>
      ) : null}
    </section>
  );
}
