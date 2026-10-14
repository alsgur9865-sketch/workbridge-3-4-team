import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PriceEstimatePage } from '@/pages/PriceEstimatePage';

vi.mock('@/features/projects/projects.api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/projects/projects.api')>();
  return {
    ...original,
    usePriceEstimate: () => ({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
      mutate: vi.fn(),
    }),
  };
});

describe('PriceEstimatePage', () => {
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
});
