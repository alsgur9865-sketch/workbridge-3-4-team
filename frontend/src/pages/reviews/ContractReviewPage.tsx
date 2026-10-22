import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { WorkflowBackLink, WorkflowPageFrame } from '@/components/WorkflowPageFrame';
import { Button } from '@/components/ui/button';
import { AccessNotice } from '@/features/applications/components/AccessNotice';
import { getApplicationErrorMessage } from '@/features/applications/format';
import { ReviewCard } from '@/features/reviews/components/ReviewCard';
import { StarRatingInput } from '@/features/reviews/components/StarRating';
import { useContractReviews, useCreateReview } from '@/features/reviews/hooks';
import { REVIEW_TAGS, type ContractReviews, type ReviewTag } from '@/features/reviews/types';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const ratingLabels = ['', '별로예요', '아쉬워요', '보통이에요', '좋아요', '최고예요'];

export function ContractReviewPage() {
  const { contractId = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const reviewsQuery = useContractReviews(contractId, Boolean(user));

  if (!user) {
    return (
      <AccessNotice
        title="로그인이 필요합니다"
        description="리뷰를 작성하려면 로그인해 주세요."
        showLoginLink
      />
    );
  }

  if (reviewsQuery.isPending) {
    return (
      <p className="mx-auto max-w-3xl px-5 py-24 text-center text-slate-500">불러오는 중...</p>
    );
  }

  if (reviewsQuery.isError) {
    return (
      <AccessNotice
        title="리뷰를 볼 수 없습니다"
        description={getApplicationErrorMessage(reviewsQuery.error)}
      />
    );
  }

  const data = reviewsQuery.data;
  const otherReviews = data.reviews.filter((review) => review.reviewerId !== user.id);

  return (
    <WorkflowPageFrame>
      <WorkflowBackLink to={`/contracts/${contractId}`}>계약서로</WorkflowBackLink>

      <p className="mt-8 text-sm font-bold text-[#0071e3]">상호 리뷰</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
        {data.projectTitle}
      </h1>
      <p className="mt-4 text-lg text-[#6e6e73]">
        <b>{data.counterpart.name ?? '상대방'}</b>님과의 협업은 어떠셨나요?
      </p>

      <div className="mt-8">
        {!data.isProjectCompleted ? (
          <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
            프로젝트가 완료된 뒤에 리뷰를 작성할 수 있습니다.
          </p>
        ) : data.myReview ? (
          <div className="grid gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              리뷰를 작성했습니다. 감사합니다!
            </p>
            <ReviewCard review={data.myReview} />
          </div>
        ) : (
          <ReviewForm data={data} />
        )}
      </div>

      <h2 className="mt-12 text-xl font-black tracking-[-0.02em]">
        {data.counterpart.name ?? '상대방'}님이 남긴 리뷰
      </h2>
      {otherReviews.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">아직 상대방이 리뷰를 작성하지 않았습니다.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {otherReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </WorkflowPageFrame>
  );
}

function ReviewForm({ data }: { data: ContractReviews }) {
  const createMutation = useCreateReview(data.contractId);
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: ReviewTag) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (rating < 1) {
      setError('별점을 선택해 주세요.');
      return;
    }
    if (content.trim().length < 10) {
      setError('리뷰 내용은 10자 이상 입력해 주세요.');
      return;
    }
    setError(null);
    createMutation.mutate({ rating, tags, content: content.trim() });
  }

  return (
    <form
      className="grid gap-6 rounded-[2rem] border border-black/5 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8"
      onSubmit={submit}
      noValidate
    >
      <div>
        <p className="text-sm font-bold text-slate-800">별점</p>
        <div className="mt-2 flex items-center gap-3">
          <StarRatingInput value={rating} onChange={setRating} />
          <span className="text-sm font-semibold text-slate-600">{ratingLabels[rating]}</span>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-slate-800">이런 점이 좋았어요 (선택)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {REVIEW_TAGS.map((tag) => {
            const selected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                  selected
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-sm font-bold text-slate-800" htmlFor="review-content">
          리뷰 내용
        </label>
        <textarea
          id="review-content"
          rows={5}
          maxLength={1000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={`${data.counterpart.name ?? '상대방'}님과 함께 일한 경험을 들려주세요.`}
          className="mt-2 w-full rounded-2xl border border-black/10 bg-[#f5f5f7] px-4 py-3.5 text-sm outline-none transition focus:border-[#0071e3] focus:bg-white focus:ring-4 focus:ring-blue-100"
        />
        <p className="mt-1 text-right text-xs text-slate-400">{content.length} / 1000</p>
      </div>

      {error || createMutation.isError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error ?? getApplicationErrorMessage(createMutation.error)}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          className="gap-1.5 rounded-full px-5 font-bold"
          disabled={createMutation.isPending}
        >
          <Send className="size-4" aria-hidden="true" />
          {createMutation.isPending ? '등록 중...' : '리뷰 등록'}
        </Button>
      </div>
    </form>
  );
}
