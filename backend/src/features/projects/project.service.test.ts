const prisma = vi.hoisted(() => ({
  freelancerProfile: { findUnique: vi.fn() },
  project: { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), update: vi.fn() },
  bookmark: { findMany: vi.fn(), findUnique: vi.fn() },
  application: { findUnique: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ getPrisma: () => prisma }));

import { getProject, listProjects, recommendProjects, updateProject } from './project.service';
import { projectListQuerySchema } from './project.schemas';

const now = new Date('2030-01-10T00:00:00Z');
function project(id: string, skills = ['React'], category = 'Web Development') {
  return {
    id,
    clientId: 'client-1',
    title: id,
    description: 'Project description',
    category,
    budget: 1000000,
    workStartAt: new Date('2030-02-01'),
    workEndAt: new Date('2030-03-01'),
    recruitmentStartAt: new Date('2030-01-01'),
    recruitmentDeadline: new Date('2030-01-20'),
    recruitmentStatus: 'SCHEDULED',
    transactionStatus: 'NONE',
    closedAt: null,
    selectedApplicationId: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    client: { id: 'client-1', name: 'Client', clientProfile: null },
    skills: skills.map((name) => ({ skill: { name } })),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  prisma.bookmark.findMany.mockResolvedValue([]);
  prisma.bookmark.findUnique.mockResolvedValue(null);
  prisma.application.findUnique.mockResolvedValue(null);
  prisma.freelancerProfile.findUnique.mockResolvedValue({
    mainCategory: 'Web Development',
    skills: [{ skill: { name: 'react' } }, { skill: { name: 'TypeScript' } }],
  });
});
afterEach(() => vi.useRealTimers());

describe('project recommendations', () => {
  it('ranks skill matches, then category, then newest; includes reasons and personal bookmarks', async () => {
    const newer = { ...project('newer', ['Figma']), createdAt: new Date('2030-01-09') };
    const older = { ...project('older', ['Figma']), createdAt: new Date('2030-01-08') };
    prisma.project.findMany.mockResolvedValue([
      older,
      newer,
      project('category', ['Figma']),
      project('skill', ['React'], 'Design'),
      project('best', ['React', 'TypeScript']),
      project('unrelated', ['Figma'], 'Design'),
    ]);
    prisma.bookmark.findMany.mockResolvedValue([{ projectId: 'best' }]);

    const result = await recommendProjects('freelancer-1');
    expect(result.data.map(({ id }) => id)).toEqual([
      'best',
      'skill',
      'category',
      'newer',
      'older',
    ]);
    expect(result.data[0]).toMatchObject({
      recruitmentStatus: 'OPEN',
      isBookmarked: true,
      recommendation: { matchedSkills: ['React', 'TypeScript'], categoryMatched: true, score: 5 },
    });
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            expect.objectContaining({
              deletedAt: null,
              closedAt: null,
              selectedApplicationId: null,
              transactionStatus: 'NONE',
              recruitmentDeadline: { gt: now },
            }),
          ],
        }),
      }),
    );
    expect(prisma.freelancerProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'freelancer-1' } }),
    );
  });

  it('returns an actionable empty state when profile information is missing', async () => {
    prisma.freelancerProfile.findUnique.mockResolvedValue(null);
    expect(await recommendProjects('new-freelancer')).toEqual({
      data: [],
      meta: { profileRequired: true },
    });
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it('supports category-only profiles and limits results to twelve', async () => {
    prisma.freelancerProfile.findUnique.mockResolvedValue({ mainCategory: 'Design', skills: [] });
    prisma.project.findMany.mockResolvedValue(
      Array.from({ length: 15 }, (_, index) => project(`design-${index}`, [], 'Design')),
    );
    const result = await recommendProjects('designer');
    expect(result.data).toHaveLength(12);
    expect(result.data[0].recommendation).toEqual({
      matchedSkills: [],
      categoryMatched: true,
      score: 1,
    });
  });
});

describe('project reads and updates', () => {
  it('applies date-based status before pagination and preserves search conditions', async () => {
    prisma.project.findMany.mockResolvedValue([project('open-now')]);
    prisma.project.count.mockResolvedValue(1);
    const result = await listProjects(
      projectListQuerySchema.parse({ status: 'OPEN', search: 'React', page: 2 }),
    );
    expect(result.data[0].recruitmentStatus).toBe('OPEN');
    const args = prisma.project.findMany.mock.calls[0][0];
    expect(args.skip).toBe(12);
    expect(args.where.AND[0].recruitmentDeadline).toEqual({ gt: now });
    expect(args.where.OR).toHaveLength(4);
    expect(prisma.project.count).toHaveBeenCalledWith({ where: args.where });
  });

  it('only exposes the current viewer application and no application for a guest', async () => {
    prisma.project.findFirst.mockResolvedValue(project('project-1'));
    prisma.application.findUnique.mockResolvedValue({ id: 'application-1', status: 'PENDING' });
    expect((await getProject('project-1', 'freelancer-1')).myApplication?.status).toBe('PENDING');
    expect(prisma.application.findUnique).toHaveBeenCalledWith({
      where: { projectId_freelancerId: { projectId: 'project-1', freelancerId: 'freelancer-1' } },
      select: { id: true, status: true },
    });
    expect((await getProject('project-1')).myApplication).toBeNull();
    expect(prisma.application.findUnique).toHaveBeenCalledTimes(1);
  });

  it('does not reopen a selected project after editing its title', async () => {
    const closed = {
      ...project('selected'),
      closedAt: now,
      selectedApplicationId: 'application-1',
      transactionStatus: 'PRICE_AGREEMENT',
    };
    prisma.project.findFirst.mockResolvedValue(closed);
    prisma.project.update.mockResolvedValue(closed);
    await updateProject('selected', 'client-1', { title: 'New title' });
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recruitmentStatus: 'CLOSED' }) }),
    );
  });
});
