import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import * as profileApi from '@/features/profile/api';
import { ProfilePage } from '@/pages/ProfilePage';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('@/features/profile/api', async () => {
  const actual = await vi.importActual<typeof import('@/features/profile/api')>(
    '@/features/profile/api',
  );
  return {
    ...actual,
    useMyProfile: vi.fn(),
    useUpdateCommonProfile: vi.fn(),
    useUpdateClientProfile: vi.fn(),
    useUpdateFreelancerProfile: vi.fn(),
  };
});

const api = vi.mocked(profileApi);
const mutate = vi.fn();

function mutationState() {
  return {
    mutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
  } as never;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.getState().setSession('token', {
    id: 'user-1',
    email: 'min@example.com',
    name: 'Min',
    role: 'FREELANCER',
  });
  api.useUpdateCommonProfile.mockReturnValue(mutationState());
  api.useUpdateClientProfile.mockReturnValue(mutationState());
  api.useUpdateFreelancerProfile.mockReturnValue(mutationState());
});

describe('ProfilePage', () => {
  it('shows and saves a freelancer profile', async () => {
    api.useMyProfile.mockReturnValue({
      data: {
        id: 'user-1',
        email: 'min@example.com',
        role: 'FREELANCER',
        name: 'Min',
        bio: '소개',
        profileImageUrl: null,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        profile: {
          role: 'FREELANCER',
          mainCategory: 'Web Development',
          careerYears: 2,
          desiredRate: 500000,
          portfolioUrl: null,
          skills: ['React', 'TypeScript'],
        },
      },
      isPending: false,
      isError: false,
    } as never);

    renderPage();

    expect(screen.getByRole('combobox', { name: '주 분야' })).toHaveValue('Web Development');
    expect(screen.getByDisplayValue('React, TypeScript')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('경력 연수'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: '저장' })[1]);

    await waitFor(() =>
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          mainCategory: 'Web Development',
          careerYears: 3,
          desiredRate: 500000,
          skills: ['React', 'TypeScript'],
        }),
      ),
    );
  });

  it('shows the recommendation hint when freelancer profile is empty', () => {
    api.useMyProfile.mockReturnValue({
      data: {
        id: 'user-1',
        email: 'min@example.com',
        role: 'FREELANCER',
        name: 'Min',
        bio: null,
        profileImageUrl: null,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        profile: null,
      },
      isPending: false,
      isError: false,
    } as never);

    renderPage();

    expect(screen.getByText(/프로필을 완성하면/)).toBeInTheDocument();
  });
});
