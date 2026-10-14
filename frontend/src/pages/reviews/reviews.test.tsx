import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReviewSummary } from '@/features/reviews/components/ReviewSummary';
import * as reviewApi from '@/features/reviews/api';
import type { ContractReviews, Review } from '@/features/reviews/types';
import { ContractReviewPage } from '@/pages/reviews/ContractReviewPage';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/features/reviews/api', () => ({
  getContractReviews: vi.fn(),
  createReview: vi.fn(),
  getUserReviews: vi.fn(),
}));

const api = vi.mocked(reviewApi);
const clientId = 'client-1';
const freelancerId = 'freelancer-1';

function review(reviewerId: string, overrides: Partial<Review> = {}): Review {
  return {
    id: `review-${reviewerId}`,
    contractId: 'contract-1',
    reviewerId,
    revieweeId: reviewerId === clientId ? freelancerId : clientId,
    rating: 5,
    content: '소통이 빠르고 결과물 완성도가 높았습니다.',
    tags: ['빠른 소통'],
    reviewer: {
      id: reviewerId,
      name: reviewerId === clientId ? '김의뢰' : '김프리',
      role: reviewerId === clientId ? 'CLIENT' : 'FREELANCER',
    },
    createdAt: '2026-10-14T00:00:00.000Z',
    ...overrides,
  };
}

function contractReviews(overrides: Partial<ContractReviews> = {}): ContractReviews {
  return {
    contractId: 'contract-1',
    projectTitle: '프리랜서 매칭 대시보드 구축',
    isProjectCompleted: true,
    counterpart: { id: freelancerId, name: '김프리' },
    canWrite: true,
    myReview: null,
    reviews: [],
    ...overrides,
  };
}

function renderWithProviders(ui: React.ReactNode, path = '/contracts/contract-1/review') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/contracts/:contractId/review" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession('test-token', {
    id: clientId,
    email: 'client@example.com',
    name: '김의뢰',
    role: 'CLIENT',
  });
});

describe('ContractReviewPage', () => {
  it('submits a rating, tags, and content', async () => {
    api.getContractReviews.mockResolvedValue(contractReviews());
    api.createReview.mockResolvedValue(review(clientId));
    renderWithProviders(<ContractReviewPage />);

    fireEvent.click(await screen.findByRole('radio', { name: '4점' }));
    fireEvent.click(screen.getByRole('button', { name: '일정 준수' }));
    fireEvent.change(screen.getByLabelText('리뷰 내용'), {
      target: { value: '일정을 잘 지켜주셔서 편하게 진행했습니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /리뷰 등록/ }));

    await waitFor(() =>
      expect(api.createReview).toHaveBeenCalledWith('contract-1', {
        rating: 4,
        tags: ['일정 준수'],
        content: '일정을 잘 지켜주셔서 편하게 진행했습니다.',
      }),
    );
  });

  it('requires a rating before submitting', async () => {
    api.getContractReviews.mockResolvedValue(contractReviews());
    renderWithProviders(<ContractReviewPage />);

    fireEvent.change(await screen.findByLabelText('리뷰 내용'), {
      target: { value: '좋은 협업이었습니다. 감사합니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /리뷰 등록/ }));

    expect(await screen.findByText('별점을 선택해 주세요.')).toBeInTheDocument();
    expect(api.createReview).not.toHaveBeenCalled();
  });

  it('waits until the project is completed', async () => {
    api.getContractReviews.mockResolvedValue(
      contractReviews({ isProjectCompleted: false, canWrite: false }),
    );
    renderWithProviders(<ContractReviewPage />);

    expect(
      await screen.findByText('프로젝트가 완료된 뒤에 리뷰를 작성할 수 있습니다.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /리뷰 등록/ })).not.toBeInTheDocument();
  });

  it('shows my review and the other party review once written', async () => {
    api.getContractReviews.mockResolvedValue(
      contractReviews({
        canWrite: false,
        myReview: review(clientId),
        reviews: [review(clientId), review(freelancerId, { content: '요구사항이 명확했어요.' })],
      }),
    );
    renderWithProviders(<ContractReviewPage />);

    expect(await screen.findByText('리뷰를 작성했습니다. 감사합니다!')).toBeInTheDocument();
    expect(screen.getByText('요구사항이 명확했어요.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /리뷰 등록/ })).not.toBeInTheDocument();
  });
});

describe('ReviewSummary', () => {
  it('shows the average rating, count, and recent reviews', async () => {
    api.getUserReviews.mockResolvedValue({
      user: { id: freelancerId, name: '김프리', role: 'FREELANCER' },
      averageRating: 4.7,
      reviewCount: 3,
      reviews: [{ ...review(clientId), project: { id: 'project-1', title: '대시보드 구축' } }],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ReviewSummary userId={freelancerId} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('4.7')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/대시보드 구축/)).toBeInTheDocument();
  });

  it('shows an empty state without reviews', async () => {
    api.getUserReviews.mockResolvedValue({
      user: { id: clientId, name: null, role: 'CLIENT' },
      averageRating: null,
      reviewCount: 0,
      reviews: [],
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ReviewSummary userId={clientId} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('아직 받은 리뷰가 없습니다.')).toBeInTheDocument();
  });
});
