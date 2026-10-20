import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PriceEstimatePage } from '@/pages/PriceEstimatePage';
import { useAuthStore } from '@/stores/auth.store';

const mutate = vi.hoisted(() => vi.fn());

vi.mock('@/features/projects/projects.api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/projects/projects.api')>();
  return {
    ...original,
    usePriceEstimate: () => ({
      data: undefined,
      error: null,
      isError: false,
      isPending: false,
      mutate,
    }),
  };
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/projects/price-estimate']}>
      <Routes>
        <Route path="/projects/price-estimate" element={<PriceEstimatePage />} />
        <Route path="/login" element={<p>로그인 화면</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PriceEstimatePage', () => {
  beforeEach(() => {
    mutate.mockClear();
    sessionStorage.clear();
    useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
  });

  it('explains the login requirement before a guest submits data', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'AI 프로젝트 적정 가격 분석' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인하고 분석하기' })).toBeInTheDocument();
    expect(screen.getByText('로그인 후 AI 분석이 시작됩니다.')).toBeInTheDocument();
    expect(screen.getByText(/로그인 후 입력한 정보를 그대로 이어서/)).toBeInTheDocument();
  });

  it('keeps a valid guest draft and moves to login', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('프로젝트 제목'), {
      target: { value: '예약 관리 웹서비스 구축' },
    });
    fireEvent.change(screen.getByLabelText('업무 내용'), {
      target: { value: '예약과 관리자 일정 관리 기능을 포함한 반응형 웹서비스를 구축합니다.' },
    });
    fireEvent.change(screen.getByLabelText('카테고리'), {
      target: { value: 'Web Development' },
    });
    fireEvent.change(screen.getByLabelText(/필요 기술/), {
      target: { value: 'React, TypeScript' },
    });
    fireEvent.click(screen.getByRole('button', { name: '로그인하고 분석하기' }));

    expect(await screen.findByText('로그인 화면')).toBeInTheDocument();
    expect(sessionStorage.getItem('workbridge-price-estimate-draft')).toContain(
      '예약 관리 웹서비스 구축',
    );
    expect(mutate).not.toHaveBeenCalled();
  });

  it('shows the analysis action to an authenticated user', () => {
    useAuthStore.setState({
      accessToken: 'access-token',
      user: {
        id: 'client-1',
        email: 'client@example.com',
        name: '의뢰인',
        role: 'CLIENT',
      },
    });

    renderPage();

    expect(screen.getByRole('button', { name: '적정 가격 분석하기' })).toBeInTheDocument();
    expect(screen.getByText(/API 키가 없을 때는 설정 안내/)).toBeInTheDocument();
  });
});
