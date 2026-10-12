import type { Prisma } from '@/generated/prisma/client';
import { AppError } from '@/errors/AppError';
import { getPrisma } from '@/lib/prisma';
import type {
  CreateProjectInput,
  ProjectListQuery,
  UpdateProjectInput,
} from '@/features/projects/project.schemas';

const projectInclude = {
  client: {
    select: {
      id: true,
      name: true,
      clientProfile: { select: { companyName: true } },
    },
  },
  skills: {
    include: { skill: { select: { name: true } } },
  },
} satisfies Prisma.ProjectInclude;

type ProjectRecord = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

function serializeProject(project: ProjectRecord, isBookmarked = false) {
  return {
    id: project.id,
    clientId: project.clientId,
    title: project.title,
    description: project.description,
    category: project.category,
    budget: Number(project.budget),
    workStartAt: project.workStartAt.toISOString(),
    workEndAt: project.workEndAt.toISOString(),
    recruitmentStartAt: project.recruitmentStartAt?.toISOString() ?? null,
    recruitmentDeadline: project.recruitmentDeadline.toISOString(),
    recruitmentStatus: project.recruitmentStatus,
    transactionStatus: project.transactionStatus,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    client: {
      id: project.client.id,
      name: project.client.name,
      companyName: project.client.clientProfile?.companyName ?? null,
    },
    skills: project.skills.map(({ skill }) => skill.name),
    isBookmarked,
  };
}

function uniqueSkillNames(skills: string[]) {
  const names = new Map<string, string>();
  for (const skill of skills) {
    const trimmed = skill.trim();
    if (trimmed) {
      names.set(trimmed.toLocaleLowerCase(), trimmed);
    }
  }
  return [...names.values()];
}

async function resolveSkills(skills: string[]) {
  const prisma = getPrisma();
  return Promise.all(
    uniqueSkillNames(skills).map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: {},
        create: { name },
        select: { id: true },
      }),
    ),
  );
}

function recruitmentStatus(recruitmentStartAt: Date | null, recruitmentDeadline: Date) {
  const now = new Date();
  if (recruitmentDeadline < now) {
    return 'CLOSED' as const;
  }
  if (recruitmentStartAt && recruitmentStartAt > now) {
    return 'SCHEDULED' as const;
  }
  return 'OPEN' as const;
}

function assertDateOrder(values: {
  workStartAt: Date;
  workEndAt: Date;
  recruitmentStartAt: Date | null;
  recruitmentDeadline: Date;
}) {
  if (values.workStartAt >= values.workEndAt) {
    throw new AppError(400, 'INVALID_WORK_DATES', '작업 종료일은 시작일보다 이후여야 합니다.');
  }
  if (values.recruitmentStartAt && values.recruitmentStartAt >= values.recruitmentDeadline) {
    throw new AppError(
      400,
      'INVALID_RECRUITMENT_DATES',
      '모집 마감일은 모집 시작일보다 이후여야 합니다.',
    );
  }
  if (values.recruitmentDeadline > values.workStartAt) {
    throw new AppError(
      400,
      'INVALID_PROJECT_DATES',
      '모집 마감일은 작업 시작일보다 늦을 수 없습니다.',
    );
  }
}

function projectOrderBy(sort: ProjectListQuery['sort']): Prisma.ProjectOrderByWithRelationInput {
  if (sort === 'budgetLow') return { budget: 'asc' };
  if (sort === 'budgetHigh') return { budget: 'desc' };
  if (sort === 'deadline') return { recruitmentDeadline: 'asc' };
  return { createdAt: 'desc' };
}

export async function listProjects(query: ProjectListQuery, viewerUserId?: string) {
  const prisma = getPrisma();
  if (query.bookmarkedOnly && !viewerUserId) {
    throw new AppError(401, 'AUTH_REQUIRED', '북마크한 프로젝트를 보려면 로그인이 필요합니다.');
  }

  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
    ...(query.category ? { category: query.category } : {}),
    ...(query.status ? { recruitmentStatus: query.status } : {}),
    ...(query.skill
      ? { skills: { some: { skill: { name: { contains: query.skill, mode: 'insensitive' } } } } }
      : {}),
    ...(query.minBudget !== undefined || query.maxBudget !== undefined
      ? {
          budget: {
            ...(query.minBudget !== undefined ? { gte: query.minBudget } : {}),
            ...(query.maxBudget !== undefined ? { lte: query.maxBudget } : {}),
          },
        }
      : {}),
    ...(query.bookmarkedOnly && viewerUserId
      ? { bookmarks: { some: { userId: viewerUserId } } }
      : {}),
    ...(query.search
      ? {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
            { category: { contains: query.search, mode: 'insensitive' } },
            {
              skills: {
                some: { skill: { name: { contains: query.search, mode: 'insensitive' } } },
              },
            },
          ],
        }
      : {}),
  };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: projectOrderBy(query.sort),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.project.count({ where }),
  ]);

  const bookmarks = viewerUserId
    ? await prisma.bookmark.findMany({
        where: { userId: viewerUserId, projectId: { in: projects.map(({ id }) => id) } },
        select: { projectId: true },
      })
    : [];
  const bookmarkedProjectIds = new Set(bookmarks.map(({ projectId }) => projectId));

  return {
    data: projects.map((project) =>
      serializeProject(project, bookmarkedProjectIds.has(project.id)),
    ),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export async function getProject(projectId: string, viewerUserId?: string) {
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: projectInclude,
  });

  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.');
  }

  const bookmark = viewerUserId
    ? await prisma.bookmark.findUnique({
        where: { userId_projectId: { userId: viewerUserId, projectId } },
        select: { id: true },
      })
    : null;

  return serializeProject(project, Boolean(bookmark));
}

export async function addProjectBookmark(projectId: string, userId: string) {
  const prisma = getPrisma();
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true },
  });
  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.');
  }

  await prisma.bookmark.upsert({
    where: { userId_projectId: { userId, projectId } },
    update: {},
    create: { userId, projectId },
  });
}

export async function removeProjectBookmark(projectId: string, userId: string) {
  await getPrisma().bookmark.deleteMany({ where: { userId, projectId } });
}

export async function createProject(clientId: string, input: CreateProjectInput) {
  const prisma = getPrisma();
  const skillRecords = await resolveSkills(input.skills);
  const recruitmentStartAt = input.recruitmentStartAt ? new Date(input.recruitmentStartAt) : null;
  const recruitmentDeadline = new Date(input.recruitmentDeadline);

  const project = await prisma.project.create({
    data: {
      clientId,
      title: input.title,
      description: input.description,
      category: input.category,
      budget: input.budget,
      workStartAt: new Date(input.workStartAt),
      workEndAt: new Date(input.workEndAt),
      recruitmentStartAt,
      recruitmentDeadline,
      recruitmentStatus: recruitmentStatus(recruitmentStartAt, recruitmentDeadline),
      skills: {
        create: skillRecords.map(({ id }) => ({ skillId: id })),
      },
    },
    include: projectInclude,
  });

  return serializeProject(project);
}

export async function updateProject(
  projectId: string,
  clientId: string,
  input: UpdateProjectInput,
) {
  const prisma = getPrisma();
  const existing = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
  });

  if (!existing) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.');
  }
  if (existing.clientId !== clientId) {
    throw new AppError(403, 'PROJECT_OWNER_REQUIRED', '프로젝트 작성자만 수정할 수 있습니다.');
  }

  const dates = {
    workStartAt: input.workStartAt ? new Date(input.workStartAt) : existing.workStartAt,
    workEndAt: input.workEndAt ? new Date(input.workEndAt) : existing.workEndAt,
    recruitmentStartAt: input.recruitmentStartAt
      ? new Date(input.recruitmentStartAt)
      : existing.recruitmentStartAt,
    recruitmentDeadline: input.recruitmentDeadline
      ? new Date(input.recruitmentDeadline)
      : existing.recruitmentDeadline,
  };
  assertDateOrder(dates);

  const skillRecords = input.skills ? await resolveSkills(input.skills) : null;
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      title: input.title,
      description: input.description,
      category: input.category,
      budget: input.budget,
      workStartAt: input.workStartAt ? dates.workStartAt : undefined,
      workEndAt: input.workEndAt ? dates.workEndAt : undefined,
      recruitmentStartAt: input.recruitmentStartAt ? dates.recruitmentStartAt : undefined,
      recruitmentDeadline: input.recruitmentDeadline ? dates.recruitmentDeadline : undefined,
      recruitmentStatus: recruitmentStatus(dates.recruitmentStartAt, dates.recruitmentDeadline),
      ...(skillRecords
        ? {
            skills: {
              deleteMany: {},
              create: skillRecords.map(({ id }) => ({ skillId: id })),
            },
          }
        : {}),
    },
    include: projectInclude,
  });

  return serializeProject(project);
}

export async function deleteProject(projectId: string, clientId: string) {
  const prisma = getPrisma();
  const existing = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { clientId: true },
  });

  if (!existing) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', '프로젝트를 찾을 수 없습니다.');
  }
  if (existing.clientId !== clientId) {
    throw new AppError(403, 'PROJECT_OWNER_REQUIRED', '프로젝트 작성자만 삭제할 수 있습니다.');
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      deletedAt: new Date(),
      recruitmentStatus: 'CLOSED',
      closedAt: new Date(),
    },
  });
}
