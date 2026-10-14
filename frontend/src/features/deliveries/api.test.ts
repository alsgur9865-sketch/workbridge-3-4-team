import { apiClient } from '@/lib/api-client';
import { uploadAttachment } from './api';

vi.mock('@/lib/api-client', () => ({ apiClient: { post: vi.fn() } }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('uploads directly with only a temporary signed URL, not the application JWT or cookies', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({
    data: {
      data: {
        path: 'contract/user/object/result.pdf',
        signedUrl: 'https://storage.example/signed-upload',
      },
    },
  });
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
  const file = new File(['pdf'], 'result.pdf', { type: 'application/pdf' });
  expect(await uploadAttachment('contract', file)).toBe('contract/user/object/result.pdf');
  expect(apiClient.post).toHaveBeenCalledWith('/contracts/contract/delivery/upload-url', {
    filename: 'result.pdf',
    contentType: 'application/pdf',
    size: 3,
  });
  expect(fetchMock).toHaveBeenCalledWith(
    'https://storage.example/signed-upload',
    expect.objectContaining({
      method: 'PUT',
      credentials: 'omit',
      headers: { 'x-upsert': 'false' },
    }),
  );
  expect(fetchMock.mock.calls[0][1].body).toBeInstanceOf(FormData);
});
it('does not return a path when direct storage upload fails', async () => {
  vi.mocked(apiClient.post).mockResolvedValue({
    data: { data: { path: 'result.pdf', signedUrl: 'https://storage.example/upload' } },
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(
    uploadAttachment('contract', new File(['pdf'], 'result.pdf', { type: 'application/pdf' })),
  ).rejects.toThrow('파일 업로드에 실패');
});
