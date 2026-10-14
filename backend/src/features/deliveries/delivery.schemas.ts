import { z } from 'zod';

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
export const attachmentTypes: Record<string, string[]> = {
  pdf: ['application/pdf'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  txt: ['text/plain'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
};

export function validAttachmentType(filename: string, contentType: string) {
  const extension = filename.split('.').at(-1)?.toLowerCase() ?? '';
  return (
    attachmentTypes[extension]?.includes(contentType.toLowerCase().split(';')[0].trim()) ?? false
  );
}

export const contractParams = z.object({ contractId: z.uuid() });
export const deliveryParams = z.object({ deliveryId: z.uuid() });
export const pathSchema = z.string().min(1).max(512);
export const deliveryInput = z
  .object({
    message: z.string().trim().min(10).max(5000),
    resultUrl: z
      .url({ protocol: /^https?$/ })
      .max(2048)
      .nullable()
      .optional(),
    attachmentUrls: z.array(pathSchema).max(MAX_ATTACHMENTS).default([]),
  })
  .strict()
  .refine((input) => new Set(input.attachmentUrls).size === input.attachmentUrls.length, {
    message: 'Duplicate attachments are not allowed.',
    path: ['attachmentUrls'],
  });
export const uploadInput = z
  .object({
    filename: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[\p{L}\p{N}][\p{L}\p{N} ._-]*$/u),
    contentType: z.string().min(1).max(150),
    size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES),
  })
  .strict()
  .refine((input) => validAttachmentType(input.filename, input.contentType), {
    message: 'Unsupported attachment type.',
    path: ['contentType'],
  });
export type DeliveryInput = z.infer<typeof deliveryInput>;
