import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const STARS = [1, 2, 3, 4, 5];

export function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={`별점 ${rating}점`}
    >
      {STARS.map((star) => (
        <Star
          key={star}
          className={cn(
            'size-4',
            star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
          )}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="별점 선택">
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star}점`}
          onClick={() => onChange(star)}
          className="rounded-md p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <Star
            className={cn(
              'size-8',
              star <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300',
            )}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}
