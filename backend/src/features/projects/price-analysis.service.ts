import OpenAI from 'openai';
import { env } from '@/config/env';
import { AppError } from '@/errors/AppError';
import type { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import {
  type PriceEstimateInput,
  priceEstimateResultSchema,
} from '@/features/projects/project.schemas';

const priceEstimateJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'estimatedMinAmount',
    'estimatedMaxAmount',
    'estimatedTotalAmount',
    'currency',
    'summary',
    'factors',
    'assumptions',
  ],
  properties: {
    estimatedMinAmount: { type: 'number', minimum: 0 },
    estimatedMaxAmount: { type: 'number', minimum: 0 },
    estimatedTotalAmount: { type: 'number', minimum: 0 },
    currency: { type: 'string', enum: ['KRW'] },
    summary: { type: 'string' },
    factors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'impact', 'reason'],
        properties: {
          label: { type: 'string' },
          impact: { type: 'string', enum: ['increase', 'decrease', 'neutral'] },
          reason: { type: 'string' },
        },
      },
    },
    assumptions: { type: 'array', items: { type: 'string' } },
  },
} as const;

export async function estimateProjectPrice(clientId: string, input: PriceEstimateInput) {
  if (!env.OPENAI_API_KEY) {
    throw new AppError(
      503,
      'AI_NOT_CONFIGURED',
      'OPENAI_API_KEY를 설정하면 AI 가격 분석을 사용할 수 있습니다.',
    );
  }

  const prisma = getPrisma();
  const model = env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const analysis = await prisma.aiPriceAnalysis.create({
    data: {
      clientId,
      inputDescription: input.description,
      modelName: model,
    },
    select: { id: true },
  });

  try {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model,
      instructions:
        '한국 프리랜서 시장의 프로젝트 견적 분석가입니다. 입력된 범위만 분석하고 금액은 대한민국 원화 기준으로 현실적으로 산정하세요.',
      input: JSON.stringify(input),
      max_output_tokens: 1200,
      text: {
        format: {
          type: 'json_schema',
          name: 'project_price_estimate',
          strict: true,
          schema: priceEstimateJsonSchema,
        },
      },
    });
    const result = priceEstimateResultSchema.parse(JSON.parse(response.output_text));

    await prisma.aiPriceAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: 'SUCCEEDED',
        resultJson: result as Prisma.InputJsonValue,
        estimatedTotalAmount: result.estimatedTotalAmount,
      },
    });

    return result;
  } catch (error) {
    await prisma.aiPriceAnalysis.update({
      where: { id: analysis.id },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown error',
      },
    });
    throw new AppError(
      502,
      'AI_ANALYSIS_FAILED',
      'AI 가격 분석에 실패했습니다. 다시 시도해 주세요.',
    );
  }
}
