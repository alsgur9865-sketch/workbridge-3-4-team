import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';

const projects = [
  {
    id: 'project-1',
    clientId: 'client-1',
    title: '프리랜서 매칭 대시보드 구축',
    description: '의뢰인과 프리랜서가 프로젝트 진행 상황을 관리하는 대시보드입니다.',
    category: 'Web Development',
    budget: 5_000_000,
    workStartAt: '2030-01-15T09:00:00.000Z',
    workEndAt: '2030-03-01T09:00:00.000Z',
    recruitmentStartAt: null,
    recruitmentDeadline: '2030-01-10T09:00:00.000Z',
    recruitmentStatus: 'OPEN' as const,
    transactionStatus: 'NONE',
    createdAt: '2029-12-01T09:00:00.000Z',
    updatedAt: '2029-12-01T09:00:00.000Z',
    client: { id: 'client-1', name: '테스트 의뢰인', companyName: '워크브릿지' },
    skills: ['React', 'TypeScript'],
    isBookmarked: false,
  },
  {
    id: 'project-2',
    clientId: 'client-1',
    title: 'B2B 랜딩 페이지 리디자인',
    description: '서비스 핵심 가치를 전달하는 반응형 랜딩 페이지를 개선합니다.',
    category: 'Design',
    budget: 2_200_000,
    workStartAt: '2030-01-15T09:00:00.000Z',
    workEndAt: '2030-02-01T09:00:00.000Z',
    recruitmentStartAt: null,
    recruitmentDeadline: '2030-01-10T09:00:00.000Z',
    recruitmentStatus: 'OPEN' as const,
    transactionStatus: 'NONE',
    createdAt: '2029-12-01T09:00:00.000Z',
    updatedAt: '2029-12-01T09:00:00.000Z',
    client: { id: 'client-1', name: '테스트 의뢰인', companyName: '워크브릿지' },
    skills: ['Figma', 'React'],
    isBookmarked: true,
  },
];

vi.mock('@/features/projects/projects.api', () => ({
  useToggleBookmark: () => ({ isPending: false, mutate: vi.fn() }),
  useProjects: ({ search, category }: { search?: string; category?: string }) => {
    const normalizedSearch = search?.toLowerCase();
    const filtered = projects.filter((project) => {
      const matchesCategory = !category || project.category === category;
      const matchesSearch =
        !normalizedSearch ||
        [project.title, project.description, ...project.skills]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });

    return {
      data: { data: filtered, meta: { page: 1, limit: 3, total: filtered.length, totalPages: 1 } },
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
}));

function renderHomePage() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('shows the WorkBridge value proposition and projects from the API', () => {
    renderHomePage();

    expect(
      screen.getByRole('heading', { level: 1, name: /프로젝트와 전문가를/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('프리랜서 매칭 대시보드 구축')).toBeInTheDocument();
    expect(screen.getByText('B2B 랜딩 페이지 리디자인')).toBeInTheDocument();
  });

  it('filters projects by search term', () => {
    renderHomePage();

    fireEvent.change(screen.getByRole('searchbox', { name: '프로젝트 검색' }), {
      target: { value: '리디자인' },
    });

    expect(screen.getByText('B2B 랜딩 페이지 리디자인')).toBeInTheDocument();
    expect(screen.queryByText('프리랜서 매칭 대시보드 구축')).not.toBeInTheDocument();
    expect(screen.getByText('프로젝트 1개')).toBeInTheDocument();
  });
});
