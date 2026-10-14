import { estimateProjectPrice } from '@/features/projects/price-analysis.service';

describe('price analysis service', () => {
  it('explains that an API key is required without calling OpenAI', async () => {
    await expect(
      estimateProjectPrice('client-id', {
        title: '쇼핑몰 관리자 대시보드 개발',
        description: '주문과 재고를 한눈에 확인하는 반응형 관리자 화면을 개발합니다.',
        category: 'Web Development',
        estimatedDays: 30,
        skills: ['React', 'TypeScript'],
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'AI_NOT_CONFIGURED',
    });
  });
});
