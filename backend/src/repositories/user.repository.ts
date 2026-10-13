import { getPrisma } from '@/lib/prisma';

export function findUserWithProfile(userId: string) {
  return getPrisma().user.findUnique({
    where: { id: userId },
    include: {
      clientProfile: true,
      freelancerProfile: {
        include: {
          skills: {
            include: {
              skill: true,
            },
          },
        },
      },
    },
  });
}

export function updateUser(
  userId: string,
  input: {
    name?: string;
    bio?: string | null;
    profileImageUrl?: string | null;
  },
) {
  return getPrisma().user.update({
    where: { id: userId },
    data: input,
  });
}

export function upsertClientProfile(
  userId: string,
  input: {
    companyName: string;
    industry: string;
    websiteUrl?: string | null;
  },
) {
  return getPrisma().clientProfile.upsert({
    where: { userId },
    update: {
      companyName: input.companyName,
      industry: input.industry,
      websiteUrl: input.websiteUrl,
    },
    create: {
      userId,
      companyName: input.companyName,
      industry: input.industry,
      websiteUrl: input.websiteUrl,
    },
  });
}

export function upsertFreelancerProfile(
  userId: string,
  input: {
    mainCategory: string;
    careerYears: number;
    desiredRate: number;
    portfolioUrl?: string | null;
    skills: string[];
  },
) {
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const profile = await tx.freelancerProfile.upsert({
      where: { userId },
      update: {
        mainCategory: input.mainCategory,
        careerYears: input.careerYears,
        desiredRate: input.desiredRate,
        portfolioUrl: input.portfolioUrl,
      },
      create: {
        userId,
        mainCategory: input.mainCategory,
        careerYears: input.careerYears,
        desiredRate: input.desiredRate,
        portfolioUrl: input.portfolioUrl,
      },
    });

    const skillIds: string[] = [];

    for (const skillName of input.skills) {
      let skill = await tx.skill.findFirst({
        where: {
          name: {
            equals: skillName,
            mode: 'insensitive',
          },
        },
      });

      if (!skill) {
        skill = await tx.skill.create({
          data: { name: skillName },
        });
      }

      skillIds.push(skill.id);
    }

    await tx.freelancerSkill.deleteMany({
      where: { freelancerProfileId: profile.id },
    });

    if (skillIds.length > 0) {
      await tx.freelancerSkill.createMany({
        data: skillIds.map((skillId) => ({
          freelancerProfileId: profile.id,
          skillId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.freelancerProfile.findUniqueOrThrow({
      where: { id: profile.id },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });
  });
}
