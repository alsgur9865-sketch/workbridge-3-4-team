import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { useAuthStore } from '@/stores/auth.store';

const projectApiMock = vi.hoisted(() => ({
  useDeleteProject: vi.fn(),
  useProject: vi.fn(),
  useToggleBookmark: vi.fn(),
}));

vi.mock('@/features/projects/projects.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/projects/projects.api')>()),
  ...projectApiMock,
}));

const project = {
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
  recruitmentStatus: 'OPEN' as const,
  transactionStatus: 'NONE',
  createdAt: '2029-12-01T09:00:00.000Z',
  updatedAt: '2029-12-01T09:00:00.000Z',
  client: { id: 'client-1', name: '테스트 의뢰인', companyName: '워크브릿지' },
  skills: ['React', 'TypeScript'],
  isBookmarked: false,
};

function renderPage() {
  render(
    <MemoryRouter initialEntries={[`/projects/${project.id}`]}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectDetailPage permissions', () => {
  beforeEach(() => {
    projectApiMock.useProject.mockReturnValue({ data: project, isPending: false, isError: false });
    projectApiMock.useDeleteProject.mockReturnValue({
      error: null,
      isError: false,
      isPending: false,
      mutateAsync: vi.fn(),
    });
    projectApiMock.useToggleBookmark.mockReturnValue({ isPending: false, mutate: vi.fn() });
    useAuthStore.setState({ accessToken: null, user: null, isInitialized: true });
  });

  it('shows edit and delete controls to the client who owns the project', () => {
    useAuthStore.setState({
      accessToken: 'access-token',
      user: {
        id: project.clientId,
        email: 'client@example.com',
        name: '의뢰인',
        role: 'CLIENT',
      },
    });

    renderPage();

    expect(screen.getByRole('link', { name: '수정하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument();
  });

  it('hides edit and delete controls from users who do not own the project', () => {
    useAuthStore.setState({
      accessToken: 'access-token',
      user: {
        id: 'freelancer-1',
        email: 'freelancer@example.com',
        name: '프리랜서',
        role: 'FREELANCER',
      },
    });

    renderPage();

    expect(screen.queryByRole('link', { name: '수정하기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '삭제하기' })).not.toBeInTheDocument();
  });
});
