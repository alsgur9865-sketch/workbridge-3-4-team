import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as paymentApi from '@/features/payments/api';
import { PaymentAction } from '@/features/payments/components/PaymentAction';
import type { Payment } from '@/features/payments/types';
import type { Contract } from '@/features/contracts/types';
import * as tossSdk from '@/lib/toss-payments-sdk';

vi.mock('@/features/payments/api', () => ({
  preparePayment: vi.fn(),
  confirmPayment: vi.fn(),
  getPayment: vi.fn(),
}));

vi.mock('@/lib/toss-payments-sdk', () => ({
  openTossPaymentWindow: vi.fn(),
}));

const payments = vi.mocked(paymentApi);
const toss = vi.mocked(tossSdk);

const contract: Contract = {
  id: 'contract-1',
  projectId: 'project-1',
  applicationId: 'application-1',
  clientId: 'client-1',
  freelancerId: 'freelancer-1',
  projectTitle: '테스트 프로젝트',
  agreedAmount: 4_500_000,
  contractStartAt: '2026-11-01T00:00:00.000Z',
  contractEndAt: '2026-12-01T00:00:00.000Z',
  content: null,
  status: 'SIGNED',
  clientSignedAt: '2026-10-14T00:00:00.000Z',
  freelancerSignedAt: '2026-10-14T01:00:00.000Z',
  createdAt: '2026-10-14T00:00:00.000Z',
  updatedAt: '2026-10-14T01:00:00.000Z',
};

const prepared: Payment = {
  id: 'payment-1',
  contractId: contract.id,
  provider: 'TOSS',
  orderId: 'WB-order-1',
  orderName: contract.projectTitle,
  amount: 4_500_000,
  platformFee: null,
  settlementAmount: null,
  status: 'READY',
  paidAt: null,
  escrowedAt: null,
  releasedAt: null,
  refundedAt: null,
  failureCode: null,
  failureMessage: null,
  createdAt: '2026-10-14T00:00:00.000Z',
  updatedAt: '2026-10-14T00:00:00.000Z',
};

function renderAction(isClient = true) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PaymentAction
        contract={contract}
        isClient={isClient}
        user={{ id: 'client-1', email: 'client@example.com', name: '김의뢰', role: 'CLIENT' }}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_TOSS_CLIENT_KEY', 'test_ck_workbridge');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it('prepares a server order before opening Toss Payments', async () => {
  payments.preparePayment.mockResolvedValue(prepared);
  toss.openTossPaymentWindow.mockResolvedValue();

  renderAction();
  fireEvent.click(screen.getByRole('button', { name: '결제하기' }));

  await waitFor(() => expect(payments.preparePayment).toHaveBeenCalledWith('contract-1'));
  expect(toss.openTossPaymentWindow).toHaveBeenCalledWith(
    expect.objectContaining({
      clientKey: 'test_ck_workbridge',
      customerKey: 'client-1',
      orderId: 'WB-order-1',
      amount: 4_500_000,
      contractId: 'contract-1',
    }),
  );
});

it('does not expose a payment button to the freelancer', () => {
  renderAction(false);
  expect(screen.getByText('의뢰인의 결제를 기다리고 있습니다.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '결제하기' })).not.toBeInTheDocument();
});
