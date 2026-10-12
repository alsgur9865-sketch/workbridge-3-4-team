import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectListPage } from '@/pages/ProjectListPage';

vi.mock('@/features/projects/projects.api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/projects/projects.api')>();
  return {
    ...original,
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
  });
});
