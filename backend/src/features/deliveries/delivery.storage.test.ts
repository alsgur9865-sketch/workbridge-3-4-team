import { randomUUID } from 'node:crypto';
const mocks = vi.hoisted(() => ({
  getBucket: vi.fn(),
  createSignedUploadUrl: vi.fn(),
  info: vi.fn(),
  createSignedUrl: vi.fn(),
  env: {
    SUPABASE_URL: 'https://storage.example',
    SUPABASE_SERVICE_ROLE_KEY: 'test-only-key',
    SUPABASE_STORAGE_BUCKET: 'deliveries',
  },
}));
vi.mock('@/config/env', () => ({ env: mocks.env }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ storage: { getBucket: mocks.getBucket, from: () => mocks } }),
}));
import {
  assertAttachmentPath,
  createDownload,
  createUpload,
  verifyAttachments,
} from './delivery.storage';

const contractId = randomUUID();
const freelancerId = randomUUID();
const path = `${contractId}/${freelancerId}/${randomUUID()}/result.pdf`;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
  mocks.getBucket.mockResolvedValue({
    data: { public: false, file_size_limit: 10 * 1024 * 1024 },
    error: null,
  });
  mocks.info.mockResolvedValue({
    data: { size: 100, contentType: 'application/pdf' },
    error: null,
  });
  mocks.createSignedUploadUrl.mockResolvedValue({
    data: { signedUrl: 'https://storage.example/upload', token: 'temporary-upload-token' },
    error: null,
  });
  mocks.createSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://storage.example/download' },
    error: null,
  });
});

it('generates server-owned paths and prohibits overwriting', async () => {
  const result = await createUpload(contractId, freelancerId, 'result.pdf');
  assertAttachmentPath(result.path, contractId, freelancerId);
  expect(mocks.createSignedUploadUrl).toHaveBeenCalledWith(result.path, { upsert: false });
  expect(result).not.toHaveProperty('token');
});
it('rejects unconfigured storage without making requests', async () => {
  mocks.env.SUPABASE_SERVICE_ROLE_KEY = '';
  await expect(createUpload(contractId, freelancerId, 'result.pdf')).rejects.toMatchObject({
    code: 'STORAGE_NOT_CONFIGURED',
  });
  expect(mocks.getBucket).not.toHaveBeenCalled();
});
it('rejects public buckets', async () => {
  mocks.getBucket.mockResolvedValue({ data: { public: true }, error: null });
  await expect(createUpload(contractId, freelancerId, 'result.pdf')).rejects.toMatchObject({
    code: 'STORAGE_NOT_PRIVATE',
  });
});
it('requires a server-enforced bucket upload limit', async () => {
  mocks.getBucket.mockResolvedValue({
    data: { public: false, file_size_limit: null },
    error: null,
  });
  await expect(createUpload(contractId, freelancerId, 'result.pdf')).rejects.toMatchObject({
    code: 'STORAGE_LIMITS_REQUIRED',
  });
});
it('checks uploaded object metadata, not just browser input', async () => {
  await verifyAttachments([path], contractId, freelancerId);
  expect(mocks.info).toHaveBeenCalledWith(path);
});
it.each([
  { size: 0, contentType: 'application/pdf' },
  { size: 10 * 1024 * 1024 + 1, contentType: 'application/pdf' },
  { size: 100, contentType: 'text/html' },
])('rejects invalid stored metadata %j', async (metadata) => {
  mocks.info.mockResolvedValue({ data: metadata, error: null });
  await expect(verifyAttachments([path], contractId, freelancerId)).rejects.toMatchObject({
    code: 'INVALID_ATTACHMENT',
  });
});
it('requires the object to exist', async () => {
  mocks.info.mockResolvedValue({ data: null, error: { message: 'not found' } });
  await expect(verifyAttachments([path], contractId, freelancerId)).rejects.toMatchObject({
    code: 'ATTACHMENT_NOT_UPLOADED',
  });
});
it.each([
  '../secret.pdf',
  'https://example.com/file.pdf',
  `${contractId}/${freelancerId}/../file.pdf`,
  `${contractId}/${randomUUID()}/${randomUUID()}/file.pdf`,
])('rejects traversal, URLs and cross-user paths %s', (invalidPath) => {
  expect(() => assertAttachmentPath(invalidPath, contractId, freelancerId)).toThrow();
});
it('does not contact storage for text/link-only submissions', async () => {
  await verifyAttachments([], contractId, freelancerId);
  expect(mocks.getBucket).not.toHaveBeenCalled();
});
it('uses short-lived forced-download URLs', async () => {
  expect(await createDownload(path)).toMatchObject({ expiresIn: 60 });
  expect(mocks.createSignedUrl).toHaveBeenCalledWith(path, 60, { download: true });
});
