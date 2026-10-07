import { BriefcaseBusiness } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link className="flex items-center gap-2 font-bold" to="/">
            <BriefcaseBusiness className="size-5 text-brand-600" aria-hidden="true" />
            WorkBridge
          </Link>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            MVP setup
          </span>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
