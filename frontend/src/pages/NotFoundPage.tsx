import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-3 text-4xl font-bold">Page not found</h1>
      <p className="mt-4 text-slate-600">The requested page does not exist yet.</p>
      <Link className="mt-8 inline-block font-semibold text-brand-600 hover:underline" to="/">
        Return home
      </Link>
    </section>
  );
}
