import { Bookmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProjectErrorMessage, useToggleBookmark } from './projects.api';
import { useAuthStore } from '@/stores/auth.store';

export function BookmarkButton({
  projectId,
  isBookmarked,
  compact = false,
}: {
  projectId: string;
  isBookmarked: boolean;
  compact?: boolean;
}) {
  const mutation = useToggleBookmark(projectId, isBookmarked);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const label = isBookmarked ? '북마크 해제' : '북마크 추가';

  return (
    <div className={compact ? '' : 'mt-4'}>
      <button
        aria-label={label}
        aria-pressed={isBookmarked}
        className={`inline-flex items-center justify-center gap-2 border text-sm font-bold transition disabled:opacity-50 ${compact ? 'size-8 rounded-full' : 'h-11 w-full rounded-xl'} ${isBookmarked ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-600 hover:border-brand-400'}`}
        disabled={mutation.isPending}
        onClick={() => (user ? mutation.mutate() : navigate('/login'))}
        type="button"
      >
        <Bookmark className={`size-4 ${isBookmarked ? 'fill-brand-600' : ''}`} aria-hidden="true" />
        {!compact && (mutation.isPending ? '저장 중…' : label)}
      </button>
      {mutation.isError && (
        <p className="mt-2 text-xs text-rose-700" role="alert">
          {getProjectErrorMessage(mutation.error)}
        </p>
      )}
    </div>
  );
}
