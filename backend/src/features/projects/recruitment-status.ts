import type { Prisma, ProjectRecruitmentStatus } from '@/generated/prisma/client';

type RecruitmentDates = {
  recruitmentStartAt: Date | null;
  recruitmentDeadline: Date;
  closedAt?: Date | null;
  selectedApplicationId?: string | null;
  transactionStatus?: string;
  deletedAt?: Date | null;
};

export function getRecruitmentStatus(
  project: RecruitmentDates,
  now = new Date(),
): ProjectRecruitmentStatus {
  if (
    project.deletedAt ||
    project.closedAt ||
    project.selectedApplicationId ||
    (project.transactionStatus && project.transactionStatus !== 'NONE') ||
    project.recruitmentDeadline <= now
  ) {
    return 'CLOSED';
  }
  return project.recruitmentStartAt && project.recruitmentStartAt > now ? 'SCHEDULED' : 'OPEN';
}

export function recruitmentWhere(
  status: ProjectRecruitmentStatus,
  now: Date,
): Prisma.ProjectWhereInput {
  const active = {
    deletedAt: null,
    closedAt: null,
    selectedApplicationId: null,
    transactionStatus: 'NONE',
    recruitmentDeadline: { gt: now },
  } satisfies Prisma.ProjectWhereInput;

  if (status === 'CLOSED') {
    return {
      OR: [
        { deletedAt: { not: null } },
        { closedAt: { not: null } },
        { selectedApplicationId: { not: null } },
        { transactionStatus: { not: 'NONE' } },
        { recruitmentDeadline: { lte: now } },
      ],
    };
  }
  if (status === 'SCHEDULED') return { ...active, recruitmentStartAt: { gt: now } };
  return {
    ...active,
    OR: [{ recruitmentStartAt: null }, { recruitmentStartAt: { lte: now } }],
  };
}
