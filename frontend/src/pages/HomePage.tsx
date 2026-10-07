import { CheckCircle2, CircleAlert, Database, Server, Workflow, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHealthCheck } from '@/features/health/useHealthCheck';

const stack = [
  'React + Vite + TypeScript',
  'Express + TypeScript',
  'PostgreSQL + Prisma',
  'TanStack Query + Zustand',
  'Tailwind CSS + local UI components',
];

export function HomePage() {
  const health = useHealthCheck();
  const online = health.data?.success === true;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Development environment
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            WorkBridge is ready for feature development.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            The repository includes the frontend, backend, final Prisma schema, seed data,
            validation, API documentation, tests, and CI starter configuration.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => health.refetch()} disabled={health.isFetching}>
              {health.isFetching ? 'Checking...' : 'Check backend'}
            </Button>
            <a
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium transition hover:bg-slate-100"
              href={`${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:4000'}/api-docs`}
              target="_blank"
              rel="noreferrer"
            >
              Open API docs
            </a>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            {online ? (
              <CheckCircle2 className="size-6 text-emerald-600" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-6 text-amber-600" aria-hidden="true" />
            )}
            <div>
              <p className="font-semibold">Backend status</p>
              <p className="text-sm text-slate-500">
                {online ? 'Connected to the Express API' : 'Start the backend or check the API URL'}
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        <SetupCard icon={Server} title="API" text="Versioned REST API under /api/v1" />
        <SetupCard icon={Database} title="Database" text="Final ERD implemented in Prisma" />
        <SetupCard icon={Workflow} title="Workflow" text="Lint, type check, tests, and build" />
      </div>

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Included stack</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {stack.map((item) => (
            <li key={item} className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="size-4 text-brand-600" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

interface SetupCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
}

function SetupCard({ icon: Icon, title, text }: SetupCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Icon className="size-6 text-brand-600" aria-hidden="true" />
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  );
}
