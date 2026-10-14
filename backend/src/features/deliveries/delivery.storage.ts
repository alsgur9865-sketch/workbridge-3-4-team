import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { AppError } from '@/errors/AppError';
import { MAX_ATTACHMENT_BYTES, validAttachmentType } from './delivery.schemas';

export function isStorageConfigured() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

async function privateStorage(requireUploadLimit = false) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'File storage is not configured.');
  }
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.storage.getBucket(env.SUPABASE_STORAGE_BUCKET);
  if (error || !data) {
    throw new AppError(503, 'STORAGE_UNAVAILABLE', 'File storage is unavailable.');
  }
  if (data.public) {
    throw new AppError(503, 'STORAGE_NOT_PRIVATE', 'Delivery storage must be private.');
  }
  if (
    requireUploadLimit &&
    (!data.file_size_limit || data.file_size_limit > MAX_ATTACHMENT_BYTES)
  ) {
    throw new AppError(
      503,
      'STORAGE_LIMITS_REQUIRED',
      'Set the private bucket file size limit to 10 MiB or less.',
    );
  }
  return client.storage.from(env.SUPABASE_STORAGE_BUCKET);
}

export function assertAttachmentPath(path: string, contractId: string, freelancerId: string) {
  const [contract, freelancer, objectId, filename, ...extra] = path.split('/');
  if (
    contract !== contractId ||
    freelancer !== freelancerId ||
    extra.length ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      objectId ?? '',
    ) ||
    !filename ||
    filename.length > 120 ||
    !/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u.test(filename)
  ) {
    throw new AppError(
      400,
      'INVALID_ATTACHMENT_PATH',
      'This attachment does not belong to this delivery.',
    );
  }
}

export async function createUpload(contractId: string, freelancerId: string, filename: string) {
  const storage = await privateStorage(true);
  const path = `${contractId}/${freelancerId}/${randomUUID()}/${filename}`;
  const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false });
  if (error || !data) {
    throw new AppError(503, 'STORAGE_UNAVAILABLE', 'Could not prepare the upload.');
  }
  return { path, signedUrl: data.signedUrl };
}

export async function verifyAttachments(paths: string[], contractId: string, freelancerId: string) {
  paths.forEach((path) => assertAttachmentPath(path, contractId, freelancerId));
  if (!paths.length) return;
  const storage = await privateStorage();
  for (const path of paths) {
    const { data, error } = await storage.info(path);
    if (error || !data) {
      throw new AppError(
        400,
        'ATTACHMENT_NOT_UPLOADED',
        'Upload every attachment before submitting.',
      );
    }
    if (
      typeof data.size !== 'number' ||
      !Number.isSafeInteger(data.size) ||
      data.size <= 0 ||
      data.size > MAX_ATTACHMENT_BYTES ||
      !validAttachmentType(path.split('/').at(-1) ?? '', data.contentType ?? '')
    ) {
      throw new AppError(
        400,
        'INVALID_ATTACHMENT',
        'An attachment exceeds the size or type limit.',
      );
    }
  }
}

export async function createDownload(path: string) {
  const storage = await privateStorage();
  const { data, error } = await storage.createSignedUrl(path, 60, { download: true });
  if (error || !data) {
    throw new AppError(503, 'STORAGE_UNAVAILABLE', 'Could not prepare the download.');
  }
  return { signedUrl: data.signedUrl, expiresIn: 60 };
}
