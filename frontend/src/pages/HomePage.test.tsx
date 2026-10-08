import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';

function renderHomePage() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('shows the WorkBridge value proposition and sample projects', () => {
    renderHomePage();

    expect(
      screen.getByRole('heading', { level: 1, name: /프로젝트와 전문가를/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('프리랜서 매칭 대시보드 구축')).toBeInTheDocument();
    expect(screen.getByText('B2B 랜딩 페이지 리디자인')).toBeInTheDocument();
  });

  it('filters sample projects by search term', () => {
    renderHomePage();

    fireEvent.change(screen.getByRole('searchbox', { name: '프로젝트 검색' }), {
      target: { value: '리디자인' },
    });

    expect(screen.getByText('B2B 랜딩 페이지 리디자인')).toBeInTheDocument();
    expect(screen.queryByText('프리랜서 매칭 대시보드 구축')).not.toBeInTheDocument();
    expect(screen.getByText('샘플 프로젝트 1개')).toBeInTheDocument();
  });
});
