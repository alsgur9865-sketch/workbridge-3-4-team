import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as applicationApi from '@/features/applications/api';
import type { ApplicationDetail, PriceOfferStatus } from '@/features/applications/types';
import { PriceAgreementPage } from '@/pages/applications/PriceAgreementPage';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/features/applications/api', () => ({
  applyToProject: vi.fn(),
  getProjectApplications: vi.fn(),
  getMyApplications: vi.fn(),
  decideApplication: vi.fn(),
  getApplication: vi.fn(),
  offerPrice: vi.fn(),
  respondToPriceOffer: vi.fn(),
}));

const api = vi.mocked(applicationApi);
const applicationId = 'application-1';
const clientId = 'client-1';
const freelancerId = 'freelancer-1';

function detail(
  priceOfferStatus: PriceOfferStatus,
  clientOfferAmount: number | null = null,
): ApplicationDetail {
  return {
    id: applicationId,
    projectId: 'project-1',
    freelancerId,
    introduction: '열심히 하겠습니다.',
    proposedAmount: 5_000_000,
    estimatedDays: 30,
    status: 'ACCEPTED',
    clientOfferAmount,
    priceOfferStatus,
    offeredAt: clientOfferAmount ? '2026-10-10T00:00:00.000Z' : null,
    respondedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    freelancer: {
      id: freelancerId,
      name: '김프리',
      profileImageUrl: null,
      mainCategory: '웹 개발',
      careerYears: 3,
    },
    project: {
      id: 'project-1',
      title: '프리랜서 매칭 대시보드 구축',
      budget: 5_000_000,
      clientId,
      recruitmentStatus: 'CLOSED',
      transactionStatus: priceOfferStatus === 'ACCEPTED' ? 'CONTRACT_PENDING' : 'PRICE_AGREEMENT',
      workStartAt: '2026-11-01T00:00:00.000Z',
      workEndAt: '2026-12-01T00:00:00.000Z',
      isSelected: true,
    },
    contract: null,
  };
}

function signInAs(id: string, role: 'CLIENT' | 'FREELANCER') {
  useAuthStore.getState().setSession('test-token', {
    id,
    email: `${id}@example.com`,
    name: id,
    role,
  });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/applications/${applicationId}/price`]}>
        <Routes>
          <Route path="/applications/:applicationId/price" element={<PriceAgreementPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().clearSession();
});

describe('PriceAgreementPage', () => {
  it('lets the client offer a price', async () => {
    signInAs(clientId, 'CLIENT');
    api.getApplication.mockResolvedValue(detail('NONE'));
    api.offerPrice.mockResolvedValue(detail('PENDING', 4_500_000));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    fireEvent.change(await screen.findByLabelText('제안할 최종 금액 (원)'), {
      target: { value: '4500000' },
    });
    fireEvent.click(screen.getByRole('button', { name: '금액 제안하기' }));

    await waitFor(() => expect(api.offerPrice).toHaveBeenCalledWith(applicationId, 4_500_000));
  });

  it('shows a re-offer hint after the freelancer rejected', async () => {
    signInAs(clientId, 'CLIENT');
    api.getApplication.mockResolvedValue(detail('REJECTED', 3_000_000));
    renderPage();

    expect(await screen.findByText(/이전 제안이 거절되었습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '금액 제안하기' })).toBeInTheDocument();
  });

  it('makes the client wait while the offer is pending', async () => {
    signInAs(clientId, 'CLIENT');
    api.getApplication.mockResolvedValue(detail('PENDING', 4_500_000));
    renderPage();

    expect(await screen.findByText(/프리랜서가 제안을 검토하고 있습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '금액 제안하기' })).not.toBeInTheDocument();
  });

  it('lets the freelancer accept a pending offer', async () => {
    signInAs(freelancerId, 'FREELANCER');
    api.getApplication.mockResolvedValue(detail('PENDING', 4_500_000));
    api.respondToPriceOffer.mockResolvedValue(detail('ACCEPTED', 4_500_000));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    expect(await screen.findByText('4,500,000원')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /이 금액으로 확정/ }));

    await waitFor(() =>
      expect(api.respondToPriceOffer).toHaveBeenCalledWith(applicationId, 'ACCEPTED'),
    );
  });

  it('lets the freelancer reject a pending offer', async () => {
    signInAs(freelancerId, 'FREELANCER');
    api.getApplication.mockResolvedValue(detail('PENDING', 4_500_000));
    api.respondToPriceOffer.mockResolvedValue(detail('REJECTED', 4_500_000));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /거절/ }));

    await waitFor(() =>
      expect(api.respondToPriceOffer).toHaveBeenCalledWith(applicationId, 'REJECTED'),
    );
  });

  it('shows the agreed state to both sides', async () => {
    signInAs(freelancerId, 'FREELANCER');
    api.getApplication.mockResolvedValue(detail('ACCEPTED', 4_500_000));
    renderPage();

    expect(await screen.findByText(/최종 금액이 확정되었습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /이 금액으로 확정/ })).not.toBeInTheDocument();
    expect(screen.getByText('의뢰인이 계약서를 준비하고 있습니다.')).toBeInTheDocument();
  });

  it('leads the client to write the contract once the price is agreed', async () => {
    signInAs(clientId, 'CLIENT');
    api.getApplication.mockResolvedValue(detail('ACCEPTED', 4_500_000));
    renderPage();

    expect(await screen.findByRole('link', { name: /계약서 작성하기/ })).toHaveAttribute(
      'href',
      `/applications/${applicationId}/contract/new`,
    );
  });

  it('links both sides to an existing contract', async () => {
    signInAs(freelancerId, 'FREELANCER');
    api.getApplication.mockResolvedValue({
      ...detail('ACCEPTED', 4_500_000),
      contract: { id: 'contract-1', status: 'DRAFT' },
    });
    renderPage();

    expect(await screen.findByRole('link', { name: /계약서 보기/ })).toHaveAttribute(
      'href',
      '/contracts/contract-1',
    );
  });
});
