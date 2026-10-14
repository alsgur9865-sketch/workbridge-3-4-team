import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as paymentApi from '@/features/payments/api';
import type { Payment } from '@/features/payments/types';
import { PaymentFailPage } from '@/pages/payments/PaymentFailPage';
import { PaymentSuccessPage } from '@/pages/payments/PaymentSuccessPage';

vi.mock('@/features/payments/api', () => ({
  confirmPayment: vi.fn(),
  preparePayment: vi.fn(),
  getPayment: vi.fn(),
}));

const payments = vi.mocked(paymentApi);

function payment(): Payment {
  return {
    id: 'payment-1',
    contractId: 'contract-1',
    provider: 'TOSS',
    orderId: 'WB-order-1',
    orderName: '테스트 프로젝트',
    amount: 4_500_000,
    platformFee: 450_000,
    settlementAmount: 4_050_000,
    status: 'ESCROWED',
    paidAt: '2026-10-14T00:00:00.000Z',
    escrowedAt: '2026-10-14T00:00:00.000Z',
    releasedAt: null,
    refundedAt: null,
    failureCode: null,
    failureMessage: null,
    createdAt: '2026-10-14T00:00:00.000Z',
    updatedAt: '2026-10-14T00:00:00.000Z',
  };
}

function renderAt(path: string, element: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/payments/success" element={element} />
          <Route path="/payments/fail" element={element} />
          <Route path="/contracts/:contractId" element={<p>계약서 페이지</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

it('confirms a successful redirect with paymentKey, orderId, and amount', async () => {
  payments.confirmPayment.mockResolvedValue(payment());

  renderAt(
    '/payments/success?paymentKey=pk-1&orderId=WB-order-1&amount=4500000&contractId=contract-1',
    <PaymentSuccessPage />,
  );

  await waitFor(() =>
    expect(payments.confirmPayment).toHaveBeenCalledWith({
      paymentKey: 'pk-1',
      orderId: 'WB-order-1',
      amount: 4_500_000,
    }),
  );
  expect(await screen.findByText('결제가 완료되었습니다')).toBeInTheDocument();
  expect(screen.getByText('4,050,000원')).toBeInTheDocument();
});

it('does not call confirm when the redirect data is invalid', () => {
  renderAt('/payments/success?orderId=WB-order-1', <PaymentSuccessPage />);

  expect(screen.getByText('결제 정보를 확인할 수 없습니다')).toBeInTheDocument();
  expect(payments.confirmPayment).not.toHaveBeenCalled();
});

it('shows the Toss failure message without confirming payment', () => {
  renderAt(
    '/payments/fail?code=PAY_PROCESS_CANCELED&message=사용자가%20결제를%20취소했습니다&contractId=contract-1',
    <PaymentFailPage />,
  );

  expect(screen.getByText('결제가 완료되지 않았습니다')).toBeInTheDocument();
  expect(screen.getByText('사용자가 결제를 취소했습니다')).toBeInTheDocument();
  expect(payments.confirmPayment).not.toHaveBeenCalled();
});
