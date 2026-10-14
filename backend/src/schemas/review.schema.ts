import { z } from 'zod';

export const REVIEW_TAGS = [
  '빠른 소통',
  '요구사항 명확',
  '일정 준수',
  '높은 완성도',
  '재협업 희망',
  '친절한 응대',
  '꼼꼼한 피드백',
] as const;

export const userIdParamsSchema = z.object({
  userId: z.string().uuid(),
});

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().min(10).max(1000),
  tags: z
    .array(z.enum(REVIEW_TAGS))
    .max(REVIEW_TAGS.length)
    .default([])
    .transform((tags) => [...new Set(tags)]),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
