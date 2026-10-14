import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as applicationApi from '@/features/applications/api';
import type { ApplicationDetail } from '@/features/applications/types';
import * as contractApi from '@/features/contracts/api';
import type { Contract } from '@/features/contracts/types';
import { ContractCreatePage } from '@/pages/contracts/ContractCreatePage';
import { ContractDetailPage } from '@/pages/contracts/ContractDetailPage';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/features/applications/api', () => ({
  getApplication: vi.fn(),
}));

vi.mock('@/features/contracts/api', () => ({
  createContract: vi.fn(),
  getContract: vi.fn(),
  signContract: vi.fn(),
}));

const applications = vi.mocked(applicationApi);
const contracts = vi.mocked(contractApi);
const clientId = 'client-1';
const freelancerId = 'freelancer-1';

const agreedApplication: ApplicationDetail = {
  id: 'application-1',
  projectId: 'project-1',
  freelancerId,
  introduction: '열심히 하겠습니다.',
  proposedAmount: 5_000_000,
  estimatedDays: 30,
  status: 'ACCEPTED',
  clientOfferAmount: 4_500_000,
  priceOfferStatus: 'ACCEPTED',
  offeredAt: '2026-10-10T00:00:00.000Z',
  respondedAt: '2026-10-11T00:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-11T00:00:00.000Z',
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
    transactionStatus: 'CONTRACT_PENDING',
    workStartAt: '2026-11-01T03:00:00.000Z',
    workEndAt: '2026-12-15T03:00:00.000Z',
    isSelected: true,
  },
  contract: null,
};

function contract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'contract-1',
    projectId: 'project-1',
    applicationId: 'application-1',
    clientId,
    freelancerId,
    projectTitle: '프리랜서 매칭 대시보드 구축',
    agreedAmount: 4_500_000,
    contractStartAt: '2026-11-01T00:00:00.000Z',
    contractEndAt: '2026-12-15T00:00:00.000Z',
    content: {
      projectTitle: '프리랜서 매칭 대시보드 구축',
      clientName: '김의뢰',
      freelancerName: '김프리',
      terms: '1. 작업 범위: 대시보드 화면 5종 개발',
    },
    status: 'DRAFT',
    clientSignedAt: null,
    freelancerSignedAt: null,
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-12T00:00:00.000Z',
    ...overrides,
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

function renderAt(path: string, routes: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>{routes}</Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().clearSession();
});

describe('ContractCreatePage', () => {
  const routes = (
    <>
      <Route path="/applications/:applicationId/contract/new" element={<ContractCreatePage />} />
      <Route path="/contracts/:contractId" element={<p>계약서 상세 페이지</p>} />
    </>
  );

  it('prefills the project period and creates the contract', async () => {
    signInAs(clientId, 'CLIENT');
    applications.getApplication.mockResolvedValue(agreedApplication);
    contracts.createContract.mockResolvedValue(contract());
    renderAt('/applications/application-1/contract/new', routes);

    expect(await screen.findByText('4,500,000원')).toBeInTheDocument();
    expect(screen.getByLabelText('계약 시작일')).toHaveValue('2026-11-01');
    expect(screen.getByLabelText('계약 종료일')).toHaveValue('2026-12-15');

    fireEvent.click(screen.getByRole('button', { name: /계약서 작성 완료/ }));

    expect(await screen.findByText('계약서 상세 페이지')).toBeInTheDocument();
    expect(contracts.createContract).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'application-1',
        terms: expect.stringContaining('작업 범위'),
      }),
    );
  });

  it('rejects an end date before the start date', async () => {
    signInAs(clientId, 'CLIENT');
    applications.getApplication.mockResolvedValue(agreedApplication);
    renderAt('/applications/application-1/contract/new', routes);

    fireEvent.change(await screen.findByLabelText('계약 종료일'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /계약서 작성 완료/ }));

    expect(await screen.findByText('계약 종료일은 시작일보다 뒤여야 합니다.')).toBeInTheDocument();
    expect(contracts.createContract).not.toHaveBeenCalled();
  });

  it('blocks freelancers', () => {
    signInAs(freelancerId, 'FREELANCER');
    renderAt('/applications/application-1/contract/new', routes);
    expect(
      screen.getByRole('heading', { name: '의뢰인만 작성할 수 있습니다' }),
    ).toBeInTheDocument();
  });
});

describe('ContractDetailPage', () => {
  const routes = <Route path="/contracts/:contractId" element={<ContractDetailPage />} />;

  it('requires the agreement checkbox before signing', async () => {
    signInAs(freelancerId, 'FREELANCER');
    contracts.getContract.mockResolvedValue(contract());
    contracts.signContract.mockResolvedValue(
      contract({ status: 'PARTIALLY_SIGNED', freelancerSignedAt: '2026-10-12T01:00:00.000Z' }),
    );
    renderAt('/contracts/contract-1', routes);

    const signButton = await screen.findByRole('button', { name: /전자서명하기/ });
    expect(signButton).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(signButton);

    await waitFor(() => expect(contracts.signContract).toHaveBeenCalledWith('contract-1'));
    expect(
      await screen.findByText('서명을 완료했습니다. 상대방의 서명을 기다리고 있습니다.'),
    ).toBeInTheDocument();
  });

  it('shows the completed contract once both parties signed', async () => {
    signInAs(clientId, 'CLIENT');
    contracts.getContract.mockResolvedValue(
      contract({
        status: 'SIGNED',
        clientSignedAt: '2026-10-12T00:00:00.000Z',
        freelancerSignedAt: '2026-10-12T01:00:00.000Z',
      }),
    );
    renderAt('/contracts/contract-1', routes);

    expect(await screen.findByText(/계약이 체결되었습니다/)).toBeInTheDocument();
    expect(screen.getByText('계약 체결')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /전자서명하기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '리뷰 작성하기' })).not.toBeInTheDocument();
  });

  it('offers the review once the project is completed', async () => {
    signInAs(freelancerId, 'FREELANCER');
    contracts.getContract.mockResolvedValue(
      contract({
        status: 'SIGNED',
        clientSignedAt: '2026-10-12T00:00:00.000Z',
        freelancerSignedAt: '2026-10-12T01:00:00.000Z',
        projectTransactionStatus: 'COMPLETED',
      }),
    );
    renderAt('/contracts/contract-1', routes);

    expect(await screen.findByRole('link', { name: '리뷰 작성하기' })).toHaveAttribute(
      'href',
      '/contracts/contract-1/review',
    );
  });
});
