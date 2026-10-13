import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as applicationApi from '@/features/applications/api';
import type { MyApplication, ProjectApplication } from '@/features/applications/types';
import { ApplyPage } from '@/pages/applications/ApplyPage';
import { MyApplicationsPage } from '@/pages/applications/MyApplicationsPage';
import { ProjectApplicationsPage } from '@/pages/applications/ProjectApplicationsPage';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/features/applications/api', () => ({
  applyToProject: vi.fn(),
  getProjectApplications: vi.fn(),
  getMyApplications: vi.fn(),
  decideApplication: vi.fn(),
}));

const api = vi.mocked(applicationApi);
const projectId = '11111111-1111-4111-8111-111111111111';

function renderAt(path: string, routes: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>{routes}</Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function signInAs(role: 'CLIENT' | 'FREELANCER') {
  useAuthStore.getState().setSession('test-token', {
    id: 'user-1',
    email: 'user@example.com',
    name: '테스터',
    role,
  });
}

const baseApplication = {
  id: 'application-1',
  projectId,
  freelancerId: 'freelancer-1',
  introduction: 'React와 Node.js로 비슷한 대시보드를 3번 만들어 봤습니다.',
  proposedAmount: 3_000_000,
  estimatedDays: 30,
  status: 'PENDING' as const,
  clientOfferAmount: null,
  priceOfferStatus: 'NONE' as const,
  offeredAt: null,
  respondedAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().clearSession();
});

describe('ApplyPage', () => {
  const routes = (
    <>
      <Route path="/projects/:projectId/apply" element={<ApplyPage />} />
      <Route path="/applications/me" element={<p>내 지원 현황 페이지</p>} />
    </>
  );

  it('asks guests to log in', () => {
    renderAt(`/projects/${projectId}/apply`, routes);
    expect(screen.getByRole('heading', { name: '로그인이 필요합니다' })).toBeInTheDocument();
  });

  it('shows validation errors for an empty form', async () => {
    signInAs('FREELANCER');
    renderAt(`/projects/${projectId}/apply`, routes);

    fireEvent.click(screen.getByRole('button', { name: /지원서 제출/ }));

    expect(await screen.findByText('자기소개는 10자 이상 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('제안 금액을 입력해 주세요.')).toBeInTheDocument();
    expect(api.applyToProject).not.toHaveBeenCalled();
  });

  it('submits the application and moves to my applications', async () => {
    signInAs('FREELANCER');
    api.applyToProject.mockResolvedValue(baseApplication);
    renderAt(`/projects/${projectId}/apply`, routes);

    fireEvent.change(screen.getByLabelText('자기소개 및 수행 계획'), {
      target: { value: baseApplication.introduction },
    });
    fireEvent.change(screen.getByLabelText('제안 금액 (원)'), { target: { value: '3000000' } });
    fireEvent.change(screen.getByLabelText('예상 작업 기간 (일)'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /지원서 제출/ }));

    expect(await screen.findByText('내 지원 현황 페이지')).toBeInTheDocument();
    expect(api.applyToProject).toHaveBeenCalledWith(projectId, {
      introduction: baseApplication.introduction,
      proposedAmount: 3_000_000,
      estimatedDays: 30,
    });
  });
});

describe('ProjectApplicationsPage', () => {
  const routes = (
    <Route path="/projects/:projectId/applications" element={<ProjectApplicationsPage />} />
  );

  const applicant: ProjectApplication = {
    ...baseApplication,
    freelancer: {
      id: 'freelancer-1',
      name: '김프리',
      profileImageUrl: null,
      mainCategory: '웹 개발',
      careerYears: 3,
    },
  };

  it('blocks freelancers', () => {
    signInAs('FREELANCER');
    renderAt(`/projects/${projectId}/applications`, routes);
    expect(
      screen.getByRole('heading', { name: '의뢰인만 볼 수 있는 페이지입니다' }),
    ).toBeInTheDocument();
  });

  it('lists applicants and accepts one after confirmation', async () => {
    signInAs('CLIENT');
    api.getProjectApplications.mockResolvedValue([applicant]);
    api.decideApplication.mockResolvedValue({ ...baseApplication, status: 'ACCEPTED' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderAt(`/projects/${projectId}/applications`, routes);

    expect(await screen.findByText('김프리')).toBeInTheDocument();
    expect(screen.getByText('웹 개발 · 경력 3년')).toBeInTheDocument();
    expect(screen.getByText('3,000,000원')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '이 지원자 선정' }));

    await waitFor(() =>
      expect(api.decideApplication).toHaveBeenCalledWith('application-1', 'ACCEPTED'),
    );
  });

  it('does nothing when the confirmation is cancelled', async () => {
    signInAs('CLIENT');
    api.getProjectApplications.mockResolvedValue([applicant]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderAt(`/projects/${projectId}/applications`, routes);

    fireEvent.click(await screen.findByRole('button', { name: '거절' }));
    expect(api.decideApplication).not.toHaveBeenCalled();
  });
});

describe('MyApplicationsPage', () => {
  it('shows my applications with their status', async () => {
    signInAs('FREELANCER');
    const mine: MyApplication = {
      ...baseApplication,
      status: 'ACCEPTED',
      project: {
        id: projectId,
        title: '프리랜서 매칭 대시보드 구축',
        budget: 5_000_000,
        recruitmentStatus: 'CLOSED',
        transactionStatus: 'PRICE_AGREEMENT',
      },
    };
    api.getMyApplications.mockResolvedValue([mine]);
    renderAt(
      '/applications/me',
      <Route path="/applications/me" element={<MyApplicationsPage />} />,
    );

    expect(await screen.findByText('프리랜서 매칭 대시보드 구축')).toBeInTheDocument();
    expect(screen.getByText('수락됨')).toBeInTheDocument();
    expect(screen.getByText(/의뢰인의 최종 금액 제안을 기다리고 있습니다/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '금액 협의 보기' })).toHaveAttribute(
      'href',
      '/applications/application-1/price',
    );
  });
});
