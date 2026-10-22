import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ProjectListPage } from '@/pages/ProjectListPage';
import { useAuthStore } from '@/stores/auth.store';

const recommended = vi.hoisted(() => vi.fn());

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{decodeURIComponent(location.search)}</output>;
}

vi.mock('@/features/projects/projects.api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/projects/projects.api')>();
  return {
    ...original,
    useRecommendedProjects: recommended,
    useToggleBookmark: () => ({ isPending: false, mutate: vi.fn() }),
    useProjects: () => ({
      data: {
        data: [
          {
            id: 'project-1',
            clientId: 'client-1',
            title: '관리자 대시보드 개발',
            description: '주문과 재고를 관리하는 반응형 관리자 대시보드 개발 프로젝트입니다.',
            category: 'Web Development',
            budget: 5_000_000,
            workStartAt: '2030-01-15T09:00:00.000Z',
            workEndAt: '2030-03-01T09:00:00.000Z',
            recruitmentStartAt: null,
            recruitmentDeadline: '2030-01-10T09:00:00.000Z',
            recruitmentStatus: 'OPEN',
            transactionStatus: 'NONE',
            createdAt: '2029-12-01T09:00:00.000Z',
            updatedAt: '2029-12-01T09:00:00.000Z',
            client: { id: 'client-1', name: '테스트 의뢰인', companyName: '워크브릿지' },
            skills: ['React', 'TypeScript'],
            isBookmarked: false,
          },
        ],
        meta: { page: 1, limit: 9, total: 1, totalPages: 1 },
      },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    }),
  };
});

describe('ProjectListPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isInitialized: true });
    recommended.mockReturnValue({
      data: { data: [], meta: { profileRequired: true } },
      isPending: false,
      isError: false,
    });
  });
  it('shows searchable project results', () => {
    render(
      <MemoryRouter>
        <ProjectListPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '나에게 맞는 프로젝트 찾기' })).toBeInTheDocument();
    expect(screen.getByText('관리자 대시보드 개발')).toBeInTheDocument();
    expect(screen.getByText('프로젝트 1개')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '북마크 추가' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '프로젝트 등록하기' })).not.toBeInTheDocument();
  });

  it('only shows project creation for clients', () => {
    useAuthStore.setState({
      user: { id: 'client-1', email: 'client@example.com', name: 'Client', role: 'CLIENT' },
    });
    render(
      <MemoryRouter>
        <ProjectListPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: '프로젝트 등록하기' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '나를 위한 추천 프로젝트' }),
    ).not.toBeInTheDocument();
  });

  it('guides freelancers without a profile and includes closed projects when viewing bookmarks', () => {
    useAuthStore.setState({
      user: {
        id: 'freelancer-1',
        email: 'freelancer@example.com',
        name: 'Freelancer',
        role: 'FREELANCER',
      },
    });
    render(
      <MemoryRouter>
        <ProjectListPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: '나를 위한 추천 프로젝트' })).toBeInTheDocument();
    expect(screen.getByText(/프로필에 주 분야나 기술스택을 등록하면/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '프로젝트 등록하기' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '북마크만 보기' }));
    expect(screen.getByRole('heading', { name: '내 북마크' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '모집 상태 선택' })).toHaveValue('');
  });

  it('explains recommendation failures instead of hiding them', () => {
    useAuthStore.setState({
      user: {
        id: 'freelancer-1',
        email: 'freelancer@example.com',
        name: 'Freelancer',
        role: 'FREELANCER',
      },
    });
    recommended.mockReturnValue({ isPending: false, isError: true, refetch: vi.fn() });
    render(
      <MemoryRouter>
        <ProjectListPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('추천 프로젝트를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '추천 다시 불러오기' })).toBeInTheDocument();
  });

  it('restores project filters from the URL and keeps updates there', () => {
    render(
      <MemoryRouter initialEntries={['/projects?search=React&category=Design&sort=deadline']}>
        <ProjectListPage />
        <LocationProbe />
      </MemoryRouter>,
    );

    expect(screen.getByRole('searchbox', { name: '프로젝트 검색' })).toHaveValue('React');
    expect(screen.getByRole('combobox', { name: '카테고리 선택' })).toHaveValue('Design');
    expect(screen.getByRole('combobox', { name: '정렬 기준' })).toHaveValue('deadline');

    fireEvent.change(screen.getByRole('textbox', { name: '필요 기술' }), {
      target: { value: 'TypeScript' },
    });

    expect(screen.getByTestId('location')).toHaveTextContent('skill=TypeScript');
  });
});
