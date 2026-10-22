import { ArrowLeft } from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const widths = {
  compact: 'max-w-xl',
  narrow: 'max-w-3xl',
  wide: 'max-w-4xl',
};

export function WorkflowPageFrame({
  children,
  className,
  size = 'narrow',
}: PropsWithChildren<{
  className?: string;
  size?: keyof typeof widths;
}>) {
  return (
    <div className="soft-grid min-h-[calc(100svh-4rem)] bg-[#f5f5f7]">
      <section
        className={cn(
          'mx-auto w-full px-5 py-12 text-[#1d1d1f] sm:px-6 sm:py-16 lg:px-8',
          widths[size],
          className,
        )}
      >
        {children}
      </section>
    </div>
  );
}

export function WorkflowBackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/80 px-4 py-2 text-sm font-bold text-[#6e6e73] shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-[#0071e3]"
      to={to}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}
