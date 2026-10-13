import { AppError } from '@/errors/AppError';
import * as userRepository from '@/repositories/user.repository';
import type {
  UpdateClientProfileInput,
  UpdateFreelancerProfileInput,
  UpdateUserInput,
} from '@/schemas/user.schema';

type UserWithProfile = NonNullable<
  Awaited<ReturnType<typeof userRepository.findUserWithProfile>>
>;

function nullableText(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

function serializeUser(user: UserWithProfile) {
  const profile =
    user.role === 'CLIENT'
      ? user.clientProfile
        ? {
            role: 'CLIENT' as const,
            companyName: user.clientProfile.companyName,
            industry: user.clientProfile.industry,
            websiteUrl: user.clientProfile.websiteUrl,
          }
        : null
      : user.role === 'FREELANCER'
        ? user.freelancerProfile
          ? {
              role: 'FREELANCER' as const,
              mainCategory: user.freelancerProfile.mainCategory,
              careerYears: user.freelancerProfile.careerYears,
              desiredRate: Number(user.freelancerProfile.desiredRate),
              portfolioUrl: user.freelancerProfile.portfolioUrl,
              skills: user.freelancerProfile.skills
                .map(({ skill }) => skill.name)
                .sort((left, right) => left.localeCompare(right)),
            }
          : null
        : null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    bio: user.bio,
    profileImageUrl: user.profileImageUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile,
  };
}

async function getUserOrThrow(userId: string) {
  const user = await userRepository.findUserWithProfile(userId);

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'The user does not exist.');
  }

  return user;
}

export async function getMyProfile(userId: string) {
  return serializeUser(await getUserOrThrow(userId));
}

export async function updateMyProfile(userId: string, input: UpdateUserInput) {
  await getUserOrThrow(userId);

  await userRepository.updateUser(userId, {
    name: input.name?.trim(),
    bio: nullableText(input.bio),
    profileImageUrl: nullableText(input.profileImageUrl),
  });

  return getMyProfile(userId);
}

export async function updateClientProfile(userId: string, input: UpdateClientProfileInput) {
  const user = await getUserOrThrow(userId);

  if (user.role !== 'CLIENT') {
    throw new AppError(403, 'CLIENT_ROLE_REQUIRED', 'A client profile requires the CLIENT role.');
  }

  await userRepository.upsertClientProfile(userId, {
    companyName: input.companyName.trim(),
    industry: input.industry.trim(),
    websiteUrl: nullableText(input.websiteUrl),
  });

  return getMyProfile(userId);
}

export async function updateFreelancerProfile(
  userId: string,
  input: UpdateFreelancerProfileInput,
) {
  const user = await getUserOrThrow(userId);

  if (user.role !== 'FREELANCER') {
    throw new AppError(
      403,
      'FREELANCER_ROLE_REQUIRED',
      'A freelancer profile requires the FREELANCER role.',
    );
  }

  const uniqueSkills = new Map<string, string>();
  for (const skill of input.skills) {
    const trimmed = skill.trim();
    uniqueSkills.set(trimmed.toLowerCase(), trimmed);
  }

  await userRepository.upsertFreelancerProfile(userId, {
    mainCategory: input.mainCategory,
    careerYears: input.careerYears,
    desiredRate: input.desiredRate,
    portfolioUrl: nullableText(input.portfolioUrl),
    skills: [...uniqueSkills.values()],
  });

  return getMyProfile(userId);
}
