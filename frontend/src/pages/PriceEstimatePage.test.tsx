import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PriceEstimatePage } from '@/pages/PriceEstimatePage';

const estimateState = vi.hoisted(() => ({
  data: undefined as
    | {
        estimatedMinAmount: number;
        estimatedMaxAmount: number;
        estimatedTotalAmount: number;
        currency: 'KRW';
        summary: string;
        factors: Array<{
          label: string;
          impact: 'increase' | 'decrease' | 'neutral';
          reason: string;
        }>;
        assumptions: string[];
      }
    | undefined,
  variables: undefined as
    | {
        title: string;
        description: string;
        category: string;
        estimatedDays: number;
        skills: string[];
      }
    | undefined,
}));

vi.mock('@/features/projects/projects.api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/projects/projects.api')>();
  return {
    ...original,
    usePriceEstimate: () => ({
      data: estimateState.data,
      variables: estimateState.variables,
      error: null,
      isError: false,
      isPending: false,
      mutate: vi.fn(),
    }),
  };
});

describe('PriceEstimatePage', () => {
  beforeEach(() => {
    estimateState.data = undefined;
    estimateState.variables = undefined;
  });

  it('shows the AI estimate form and empty result state', () => {
    render(
      <MemoryRouter>
        <PriceEstimatePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'AI 프로젝트 적정 가격 분석' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '적정 가격 분석하기' })).toBeInTheDocument();
    expect(screen.getByText(/API 키가 없을 때는 설정 안내/)).toBeInTheDocument();
  });

  it('passes the analyzed project data and recommended budget to project registration', async () => {
    estimateState.data = {
      estimatedMinAmount: 2_500_000,
      estimatedMaxAmount: 3_500_000,
      estimatedTotalAmount: 3_000_000.4,
      currency: 'KRW',
      summary: '테스트 분석 결과',
      factors: [],
      assumptions: [],
    };
    estimateState.variables = {
      title: 'AI 쇼핑몰 구축',
      description: '상품과 주문을 관리하는 쇼핑몰 관리자 기능을 개발합니다.',
      category: 'Web Development',
      estimatedDays: 30,
      skills: ['React', 'TypeScript'],
    };

    render(
      <MemoryRouter initialEntries={['/projects/price-estimate']}>
        <Routes>
          <Route path="/projects/price-estimate" element={<PriceEstimatePage />} />
          <Route
            path="/projects/new"
            element={
              <div>
                <h1>프로젝트 등록 이동 완료</h1>
              </div>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', {
      name: '이 견적을 예산에 반영하고 프로젝트 등록하기',
    });
    expect(button).toBeVisible();

    fireEvent.click(button);

    expect(await screen.findByRole('heading', { name: '프로젝트 등록 이동 완료' })).toBeVisible();
  });
});
