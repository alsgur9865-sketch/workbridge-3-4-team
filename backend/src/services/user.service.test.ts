const repositoryMock = vi.hoisted(() => ({
  findUserWithProfile: vi.fn(),
  updateUser: vi.fn(),
  upsertClientProfile: vi.fn(),
  upsertFreelancerProfile: vi.fn(),
}));

vi.mock('@/repositories/user.repository', () => repositoryMock);

import {
  getMyProfile,
  updateClientProfile,
  updateFreelancerProfile,
  updateMyProfile,
} from '@/services/user.service';

const baseUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'min@example.com',
  passwordHash: null,
  role: 'FREELANCER' as const,
  name: 'Min',
  bio: null,
  profileImageUrl: null,
  oauthProvider: 'GOOGLE' as const,
  oauthProviderId: 'google-1',
  refreshTokenHash: null,
  createdAt: new Date('2026-10-01T00:00:00.000Z'),
  updatedAt: new Date('2026-10-01T00:00:00.000Z'),
  clientProfile: null,
  freelancerProfile: {
    id: '22222222-2222-4222-8222-222222222222',
    userId: '11111111-1111-4111-8111-111111111111',
    mainCategory: 'Web Development',
    careerYears: 3,
    desiredRate: 500000,
    portfolioUrl: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    skills: [
      {
        freelancerProfileId: '22222222-2222-4222-8222-222222222222',
        skillId: '33333333-3333-4333-8333-333333333333',
        createdAt: new Date(),
        skill: {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'TypeScript',
          createdAt: new Date(),
        },
      },
      {
        freelancerProfileId: '22222222-2222-4222-8222-222222222222',
        skillId: '44444444-4444-4444-8444-444444444444',
        createdAt: new Date(),
        skill: {
          id: '44444444-4444-4444-8444-444444444444',
          name: 'React',
          createdAt: new Date(),
        },
      },
    ],
  },
};

describe('user service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serializes a freelancer profile for the frontend', async () => {
    repositoryMock.findUserWithProfile.mockResolvedValue(baseUser);

    const result = await getMyProfile(baseUser.id);

    expect(result.profile).toEqual({
      role: 'FREELANCER',
      mainCategory: 'Web Development',
      careerYears: 3,
      desiredRate: 500000,
      portfolioUrl: null,
      skills: ['React', 'TypeScript'],
    });
  });

  it('normalizes empty optional text when updating common fields', async () => {
    repositoryMock.findUserWithProfile.mockResolvedValue(baseUser);
    repositoryMock.updateUser.mockResolvedValue(baseUser);

    await updateMyProfile(baseUser.id, {
      name: ' Min ',
      bio: '',
      profileImageUrl: '',
    });

    expect(repositoryMock.updateUser).toHaveBeenCalledWith(baseUser.id, {
      name: 'Min',
      bio: null,
      profileImageUrl: null,
    });
  });

  it('rejects a client profile for a freelancer account', async () => {
    repositoryMock.findUserWithProfile.mockResolvedValue(baseUser);

    await expect(
      updateClientProfile(baseUser.id, {
        companyName: 'WorkBridge',
        industry: 'IT',
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'CLIENT_ROLE_REQUIRED',
    });
  });

  it('deduplicates freelancer skills case-insensitively', async () => {
    repositoryMock.findUserWithProfile.mockResolvedValue(baseUser);
    repositoryMock.upsertFreelancerProfile.mockResolvedValue(baseUser.freelancerProfile);

    await updateFreelancerProfile(baseUser.id, {
      mainCategory: 'Web Development',
      careerYears: 3,
      desiredRate: 500000,
      portfolioUrl: '',
      skills: ['React', ' react ', 'TypeScript'],
    });

    expect(repositoryMock.upsertFreelancerProfile).toHaveBeenCalledWith(
      baseUser.id,
      expect.objectContaining({
        portfolioUrl: null,
        skills: ['react', 'TypeScript'],
      }),
    );
  });
});
