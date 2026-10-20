export const REVIEW_TAGS = [
  '빠른 소통',
  '요구사항 명확',
  '일정 준수',
  '높은 완성도',
  '재협업 희망',
  '친절한 응대',
  '꼼꼼한 피드백',
] as const;

export type ReviewTag = (typeof REVIEW_TAGS)[number];

export interface Review {
  id: string;
  contractId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  content: string;
  tags: string[];
  reviewer: { id: string; name: string | null; role: 'CLIENT' | 'FREELANCER' | null };
  createdAt: string;
}

export interface ContractReviews {
  contractId: string;
  projectTitle: string;
  isProjectCompleted: boolean;
  counterpart: { id: string; name: string | null };
  canWrite: boolean;
  myReview: Review | null;
  reviews: Review[];
}

export interface UserReviews {
  user: { id: string; name: string | null; role: 'CLIENT' | 'FREELANCER' | null };
  averageRating: number | null;
  reviewCount: number;
  reviews: (Review & { project: { id: string; title: string } })[];
}

export interface CreateReviewInput {
  rating: number;
  content: string;
  tags: ReviewTag[];
}

export interface ReviewHighlights {
  averageRating: number | null;
  reviewCount: number;
  completedProjectCount: number;
  includesDemoData: boolean;
  hasOnlyDemoReviews: boolean;
  reviews: Array<{
    id: string;
    rating: number;
    content: string;
    tags: string[];
    reviewerRole: 'CLIENT' | 'FREELANCER' | null;
    project: { id: string; title: string };
    createdAt: string;
    isDemo: boolean;
  }>;
}
