import { formatDate } from '@/features/applications/format';
import { StarRating } from '@/features/reviews/components/StarRating';
import type { Review } from '@/features/reviews/types';

const roleLabels = { CLIENT: '의뢰인', FREELANCER: '프리랜서' } as const;

export function ReviewCard({ review, projectTitle }: { review: Review; projectTitle?: string }) {
  const role = review.reviewer.role ? roleLabels[review.reviewer.role] : null;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} />
          <span className="text-sm font-bold">{review.rating}.0</span>
        </div>
        <span className="text-xs text-slate-500">{formatDate(review.createdAt)}</span>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{review.content}</p>
      {review.tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {review.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">
        {review.reviewer.name ?? '이름 미등록'}
        {role ? ` · ${role}` : ''}
        {projectTitle ? ` · ${projectTitle}` : ''}
      </p>
    </article>
  );
}
