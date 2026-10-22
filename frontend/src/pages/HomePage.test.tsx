import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

vi.mock('@/features/reviews/api', () => ({
  useReviewHighlights: () => ({
    data: {
      averageRating: 5,
      reviewCount: 2,
      completedProjectCount: 1,
      includesDemoData: true,
      hasOnlyDemoReviews: true,
      reviews: [
        {
          id: 'review-1',
          rating: 5,
          content: '요구사항이 명확했고 일정에 맞춰 만족스럽게 협업했습니다.',
          tags: ['요구사항 명확', '일정 준수'],
          reviewerRole: 'FREELANCER',
          project: { id: 'completed-project-1', title: '예약 플랫폼 구축' },
          createdAt: '2030-03-01T09:00:00.000Z',
          isDemo: true,
        },
      ],
    },
    isPending: false,
  }),
}));

function renderHomePage() {
  render(
    <MemoryRouter>
      <HomePage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {`${location.pathname}${decodeURIComponent(location.search)}${location.hash}`}
    </output>
  );
}

describe('HomePage', () => {
  it('shows the WorkBridge value proposition and projects from the API', () => {
    renderHomePage();

    expect(
      screen.getByRole('heading', { level: 1, name: /좋은 프로젝트와 좋은 전문가가/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('프리랜서 매칭 대시보드 구축')).toBeInTheDocument();
    expect(screen.getByText('B2B 랜딩 페이지 리디자인')).toBeInTheDocument();
    expect(screen.getByText('가입과 역할 설정')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '필요한 전문가를 찾으세요.' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '내 역량에 맞는 일을 만나세요.' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '프리랜서' }));

    expect(
      screen.getByRole('heading', { name: '내 역량에 맞는 일을 만나세요.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AI 예상 견적.*바로 분석하기/ })).toHaveAttribute(
      'href',
      '/projects/price-estimate',
    );
    expect(screen.getByText('분석 결과 예시')).toBeInTheDocument();
    expect(screen.getByText('350만~520만원')).toBeInTheDocument();
    expect(screen.getByText('완료 프로젝트')).toBeInTheDocument();
    expect(screen.getByText('5.0 / 5')).toBeInTheDocument();
    expect(screen.getByText('데모 데이터 포함')).toBeInTheDocument();
    expect(screen.getByText(/요구사항이 명확했고/)).toBeInTheDocument();
  });

  it('filters projects by search term', () => {
    renderHomePage();

    fireEvent.change(screen.getByRole('searchbox', { name: '프로젝트 검색' }), {
      target: { value: '리디자인' },
    });

    expect(screen.getByText('B2B 랜딩 페이지 리디자인')).toBeInTheDocument();
    expect(screen.queryByText('프리랜서 매칭 대시보드 구축')).not.toBeInTheDocument();
    expect(screen.getByText('프로젝트 1개')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/?search=리디자인#projects');
  });

  it('filters projects with the popular category buttons', () => {
    renderHomePage();

    fireEvent.click(screen.getByRole('button', { name: '디자인' }));

    expect(screen.getByText('B2B 랜딩 페이지 리디자인')).toBeInTheDocument();
    expect(screen.queryByText('프리랜서 매칭 대시보드 구축')).not.toBeInTheDocument();
    expect(screen.getByText('프로젝트 1개')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '디자인' })).toHaveAttribute('aria-pressed', 'true');
  });
});
