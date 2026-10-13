import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProjectFormPage } from '@/pages/ProjectFormPage';
import { useAuthStore } from '@/stores/auth.store';

const createProject = vi.hoisted(() => vi.fn());

vi.mock('@/features/projects/projects.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/projects/projects.api')>()),
  useProject: () => ({ data: undefined, isPending: false, isError: false }),
  useCreateProject: () => ({ mutateAsync: createProject, isPending: false, isError: false }),
  useUpdateProject: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false }),
}));

function renderForm() {
  render(
    <MemoryRouter initialEntries={['/projects/new']}>
      <Routes>
        <Route path="/projects/new" element={<ProjectFormPage />} />
        <Route path="/projects/project-1" element={<h1>등록한 프로젝트 상세</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillForm(budget: string) {
  fireEvent.change(screen.getByLabelText('프로젝트 제목'), {
    target: { value: '관리자 대시보드 개발' },
  });
  fireEvent.change(screen.getByLabelText('상세 설명'), {
    target: { value: '주문과 재고를 관리하는 반응형 관리자 대시보드를 개발합니다.' },
  });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Web Development' } });
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: budget } });
  fireEvent.change(screen.getByLabelText(/필요 기술/), { target: { value: 'React, TypeScript' } });
  fireEvent.change(screen.getByLabelText('모집 마감일'), {
    target: { value: '2030-01-10T18:00' },
  });
  fireEvent.change(screen.getByLabelText('작업 시작일'), {
    target: { value: '2030-01-15T09:00' },
  });
  fireEvent.change(screen.getByLabelText('작업 종료일'), {
    target: { value: '2030-03-01T18:00' },
  });
}

describe('ProjectFormPage', () => {
  beforeEach(() => {
    createProject.mockReset().mockResolvedValue({ id: 'project-1' });
    useAuthStore.setState({
      user: { id: 'client-1', email: 'client@example.com', name: '의뢰인', role: 'CLIENT' },
      accessToken: 'access-token',
      isInitialized: true,
    });
  });

  it.each(['1', '10000', '12345', '5000000'])(
    'accepts a whole-won budget of %s and opens the saved project',
    async (budget) => {
      renderForm();
      fillForm(budget);
      expect(screen.getByRole('spinbutton')).toBeValid();
      fireEvent.click(screen.getByRole('button', { name: '프로젝트 등록' }));

      expect(await screen.findByRole('heading', { name: '등록한 프로젝트 상세' })).toBeVisible();
      expect(createProject).toHaveBeenCalledExactlyOnceWith({
        title: '관리자 대시보드 개발',
        description: '주문과 재고를 관리하는 반응형 관리자 대시보드를 개발합니다.',
        category: 'Web Development',
        budget: Number(budget),
        skills: ['React', 'TypeScript'],
        recruitmentDeadline: new Date('2030-01-10T18:00').toISOString(),
        workStartAt: new Date('2030-01-15T09:00').toISOString(),
        workEndAt: new Date('2030-03-01T18:00').toISOString(),
      });
    },
  );

  it.each([
    ['', '예산을 숫자로 입력해 주세요.'],
    ['0', '예산을 입력해 주세요.'],
    ['-100', '예산을 입력해 주세요.'],
    ['1.5', '예산은 원 단위 정수로 입력해 주세요.'],
    ['1000000001', '예산은 10억 원 이하로 입력해 주세요.'],
  ])('explains an invalid budget of %s without submitting', async (budget, message) => {
    renderForm();
    fillForm(budget);
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 등록' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-invalid', 'true');
    expect(createProject).not.toHaveBeenCalled();
  });

  it('keeps date validation active when native validation is disabled', async () => {
    renderForm();
    fillForm('5000000');
    fireEvent.change(screen.getByLabelText('작업 종료일'), {
      target: { value: '2030-01-01T18:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 등록' }));

    await waitFor(() =>
      expect(screen.getByText('종료일은 시작일보다 이후여야 합니다.')).toBeVisible(),
    );
    expect(createProject).not.toHaveBeenCalled();
  });

  it('does not allow freelancers to register projects', () => {
    useAuthStore.setState({
      user: {
        id: 'freelancer-1',
        email: 'freelancer@example.com',
        name: '프리랜서',
        role: 'FREELANCER',
      },
    });
    renderForm();
    expect(
      screen.getByRole('heading', { name: '의뢰인만 프로젝트를 등록할 수 있습니다' }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: '프로젝트 등록' })).not.toBeInTheDocument();
  });
});
