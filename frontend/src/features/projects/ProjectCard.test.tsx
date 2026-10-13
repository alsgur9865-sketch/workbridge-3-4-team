import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectCard } from './ProjectCard';
import type { Project } from './projects.api';
import { useAuthStore } from '@/stores/auth.store';

const toggleBookmark = vi.hoisted(() => vi.fn());

vi.mock('./projects.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./projects.api')>()),
  useToggleBookmark: () => ({ mutate: toggleBookmark, isPending: false, isError: false }),
}));

const project: Project = {
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
  client: { id: 'client-1', name: '의뢰인', companyName: null },
  skills: ['React'],
  isBookmarked: false,
};

function renderCard() {
  render(
    <MemoryRouter initialEntries={['/projects']}>
      <Routes>
        <Route path="/projects" element={<ProjectCard project={project} />} />
        <Route path="/projects/:projectId" element={<h1>프로젝트 상세</h1>} />
        <Route path="/login" element={<h1>로그인</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectCard', () => {
  beforeEach(() => {
    toggleBookmark.mockClear();
    useAuthStore.setState({
      user: {
        id: 'freelancer-1',
        email: 'freelancer@example.com',
        name: '프리랜서',
        role: 'FREELANCER',
      },
      accessToken: 'access-token',
      isInitialized: true,
    });
  });

  it('uses the project title as the single detail link', () => {
    renderCard();
    const link = screen.getByRole('link', { name: project.title });
    expect(link).toHaveAttribute('href', '/projects/project-1');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByText('자세히 보기')).not.toBeInTheDocument();
    fireEvent.click(link);
    expect(screen.getByRole('heading', { name: '프로젝트 상세' })).toBeVisible();
  });

  it('toggles bookmarks independently without opening the detail page', () => {
    renderCard();
    const bookmark = screen.getByRole('button', { name: '북마크 추가' });
    expect(bookmark.closest('a')).toBeNull();
    fireEvent.click(bookmark);
    expect(toggleBookmark).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: project.title })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '프로젝트 상세' })).not.toBeInTheDocument();
  });

  it('takes guests to login only when they click the bookmark', () => {
    useAuthStore.setState({ user: null, accessToken: null });
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: '북마크 추가' }));
    expect(screen.getByRole('heading', { name: '로그인' })).toBeVisible();
    expect(toggleBookmark).not.toHaveBeenCalled();
  });
});
