import { MessageSquareQuote, Star } from 'lucide-react';
import { ReviewCard } from '@/features/reviews/components/ReviewCard';
import { StarRating } from '@/features/reviews/components/StarRating';
import { useUserReviews } from '@/features/reviews/hooks';

export function ReviewSummary({ userId, title = '받은 리뷰' }: { userId: string; title?: string }) {
  const reviewsQuery = useUserReviews(userId);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <MessageSquareQuote className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            함께 일한 상대방이 남긴 평가입니다. 최근 리뷰 10개까지 보여드립니다.
          </p>
        </div>
      </div>

      {reviewsQuery.isPending ? (
        <p className="mt-6 text-sm text-slate-500">리뷰를 불러오는 중...</p>
      ) : reviewsQuery.isError ? (
        <p className="mt-6 text-sm text-rose-600">리뷰를 불러오지 못했습니다.</p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-6 rounded-2xl bg-slate-50 px-5 py-4">
            <div>
              <p className="text-xs font-bold text-slate-500">평균 평점</p>
              <p className="mt-1 flex items-center gap-2">
                <span className="text-3xl font-black">
                  {reviewsQuery.data.averageRating?.toFixed(1) ?? '-'}
                </span>
                {reviewsQuery.data.averageRating !== null ? (
                  <StarRating rating={reviewsQuery.data.averageRating} />
                ) : null}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">리뷰 개수</p>
              <p className="mt-1 flex items-center gap-1 text-3xl font-black">
                <Star className="size-5 text-amber-400" aria-hidden="true" />
                {reviewsQuery.data.reviewCount}
              </p>
            </div>
          </div>

          {reviewsQuery.data.reviews.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">아직 받은 리뷰가 없습니다.</p>
          ) : (
            <div className="mt-6 grid gap-3">
              {reviewsQuery.data.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} projectTitle={review.project.title} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
