import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as api from '@/features/deliveries/api';
import { DeliveryPage } from './DeliveryPage';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/features/deliveries/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/deliveries/api')>()),
  getDelivery: vi.fn(),
  submitDelivery: vi.fn(),
  uploadAttachment: vi.fn(),
  downloadAttachment: vi.fn(),
  approveDelivery: vi.fn(),
}));
const mockedApi = vi.mocked(api);
const fixture: api.DeliveryPageData = {
  contractId: 'contract-1',
  projectId: 'project-1',
  projectTitle: '테스트 웹사이트 제작',
  clientId: 'client-1',
  freelancerId: 'freelancer-1',
  projectTransactionStatus: 'IN_PROGRESS',
  canSubmit: true,
  canApprove: false,
  settlementAvailable: false,
  storageConfigured: false,
  delivery: null,
  uploadPolicy: { maxFiles: 5, maxBytes: 10 * 1024 * 1024, extensions: ['pdf', 'zip', 'png'] },
};
const submitted: api.Delivery = {
  id: 'delivery-1',
  contractId: 'contract-1',
  message: '완성한 웹사이트와 사용 방법입니다.',
  resultUrl: 'https://example.com',
  attachmentUrls: ['contract-1/freelancer-1/file/result.pdf'],
  status: 'SUBMITTED',
  submittedAt: '2026-10-14T02:00:00Z',
  approvedAt: null,
};

function signIn(role: 'CLIENT' | 'FREELANCER' = 'FREELANCER') {
  useAuthStore.getState().setSession('test-token', {
    id: role === 'CLIENT' ? 'client-1' : 'freelancer-1',
    role,
    email: 'test@example.com',
    name: '테스트',
  });
}
function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/contracts/contract-1/delivery']}>
        <Routes>
          <Route path="/contracts/:contractId/delivery" element={<DeliveryPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.getState().clearSession();
  mockedApi.getDelivery.mockResolvedValue(fixture);
  mockedApi.submitDelivery.mockResolvedValue(submitted);
});

it('asks anonymous visitors to log in without loading private data', () => {
  renderPage();
  expect(screen.getByText('로그인이 필요합니다')).toBeInTheDocument();
  expect(mockedApi.getDelivery).not.toHaveBeenCalled();
});
it('supports submitting text and link without storage keys', async () => {
  signIn();
  renderPage();
  expect(
    await screen.findByText('파일 저장소 연결 전입니다. 설명과 링크는 제출할 수 있습니다.'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('첨부파일 (선택)')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('결과 설명 (필수)'), {
    target: { value: submitted.message },
  });
  fireEvent.change(screen.getByLabelText('결과물 링크 (선택)'), {
    target: { value: submitted.resultUrl },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  mockedApi.getDelivery.mockResolvedValue({ ...fixture, delivery: submitted, canSubmit: false });
  fireEvent.click(screen.getByRole('button', { name: '최종 결과물 제출' }));
  await waitFor(() =>
    expect(mockedApi.submitDelivery).toHaveBeenCalledWith('contract-1', {
      message: submitted.message,
      resultUrl: submitted.resultUrl,
      attachmentUrls: [],
    }),
  );
  expect(await screen.findByText('제출된 결과물')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '최종 결과물 제출' })).not.toBeInTheDocument();
});
it('requires a sufficiently detailed message', async () => {
  signIn();
  renderPage();
  await screen.findByLabelText('결과 설명 (필수)');
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '최종 결과물 제출' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('10~5,000자');
  expect(mockedApi.submitDelivery).not.toHaveBeenCalled();
});
it('rejects unsafe result URLs', async () => {
  signIn();
  renderPage();
  fireEvent.change(await screen.findByLabelText('결과 설명 (필수)'), {
    target: { value: submitted.message },
  });
  fireEvent.change(screen.getByLabelText('결과물 링크 (선택)'), {
    target: { value: 'javascript:alert(1)' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '최종 결과물 제출' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('http 또는 https');
  expect(mockedApi.submitDelivery).not.toHaveBeenCalled();
});
it('keeps inputs after a failed submit', async () => {
  signIn();
  mockedApi.submitDelivery.mockRejectedValue(new Error('서버 연결 실패'));
  renderPage();
  fireEvent.change(await screen.findByLabelText('결과 설명 (필수)'), {
    target: { value: submitted.message },
  });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '최종 결과물 제출' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('서버 연결 실패');
  expect(screen.getByLabelText('결과 설명 (필수)')).toHaveValue(submitted.message);
});
it('uploads and stores an object path before final submission', async () => {
  signIn();
  mockedApi.getDelivery.mockResolvedValue({ ...fixture, storageConfigured: true });
  mockedApi.uploadAttachment.mockResolvedValue('contract-1/freelancer-1/file/result.pdf');
  renderPage();
  const file = new File(['result'], 'result.pdf', { type: 'application/pdf' });
  fireEvent.change(await screen.findByLabelText('첨부파일 (선택)'), { target: { files: [file] } });
  expect(await screen.findByText('result.pdf')).toBeInTheDocument();
  expect(mockedApi.uploadAttachment).toHaveBeenCalledWith('contract-1', file);
  fireEvent.click(screen.getByRole('button', { name: 'result.pdf 첨부 취소' }));
  expect(screen.queryByText('result.pdf')).not.toBeInTheDocument();
});
it('rejects unsupported files before uploading', async () => {
  signIn();
  mockedApi.getDelivery.mockResolvedValue({ ...fixture, storageConfigured: true });
  renderPage();
  fireEvent.change(await screen.findByLabelText('첨부파일 (선택)'), {
    target: { files: [new File(['script'], 'bad.html', { type: 'text/html' })] },
  });
  expect(await screen.findByRole('alert')).toHaveTextContent('파일 형식과 크기');
  expect(mockedApi.uploadAttachment).not.toHaveBeenCalled();
});
it('disables final submission during upload', async () => {
  signIn();
  mockedApi.getDelivery.mockResolvedValue({ ...fixture, storageConfigured: true });
  mockedApi.uploadAttachment.mockReturnValue(new Promise(() => {}));
  renderPage();
  fireEvent.change(await screen.findByLabelText('첨부파일 (선택)'), {
    target: { files: [new File(['result'], 'result.pdf', { type: 'application/pdf' })] },
  });
  expect(await screen.findByText(/파일 업로드 중/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '최종 결과물 제출' })).toBeDisabled();
});
it('shows a waiting message before payment instead of a submission form', async () => {
  signIn();
  mockedApi.getDelivery.mockResolvedValue({
    ...fixture,
    canSubmit: false,
    projectTransactionStatus: 'PAYMENT_PENDING',
  });
  renderPage();
  expect(await screen.findByText(/작업 중인 프로젝트에서 결과물을 제출/)).toBeInTheDocument();
  expect(screen.queryByLabelText('결과 설명 (필수)')).not.toBeInTheDocument();
});
it('lets clients view results but not approve before settlement integration', async () => {
  signIn('CLIENT');
  mockedApi.getDelivery.mockResolvedValue({ ...fixture, canSubmit: false, delivery: submitted });
  renderPage();
  expect(await screen.findByText(/정산 기능 연결을 준비 중/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '결과물 승인하기' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'result.pdf' })).toBeEnabled();
  expect(mockedApi.approveDelivery).not.toHaveBeenCalled();
});
it('requires explicit client confirmation for an integrated approval', async () => {
  signIn('CLIENT');
  mockedApi.getDelivery.mockResolvedValue({
    ...fixture,
    delivery: submitted,
    canSubmit: false,
    canApprove: true,
    settlementAvailable: true,
  });
  mockedApi.approveDelivery.mockResolvedValue({ ...submitted, status: 'APPROVED' });
  renderPage();
  const button = await screen.findByRole('button', { name: '결과물 승인하기' });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(button);
  await waitFor(() => expect(mockedApi.approveDelivery).toHaveBeenCalledWith('delivery-1'));
});
it('connects an approved delivery to the agreed review route', async () => {
  signIn();
  mockedApi.getDelivery.mockResolvedValue({
    ...fixture,
    canSubmit: false,
    delivery: { ...submitted, status: 'APPROVED' },
    projectTransactionStatus: 'COMPLETED',
  });
  renderPage();
  expect(await screen.findByRole('link', { name: '리뷰 작성하기' })).toHaveAttribute(
    'href',
    '/contracts/contract-1/review',
  );
});
it('shows read failures and supports retry', async () => {
  signIn();
  mockedApi.getDelivery.mockRejectedValue(new Error('권한이 없습니다'));
  renderPage();
  expect(await screen.findByText('권한이 없습니다')).toBeInTheDocument();
  mockedApi.getDelivery.mockResolvedValue(fixture);
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(await screen.findByLabelText('결과 설명 (필수)')).toBeInTheDocument();
});
