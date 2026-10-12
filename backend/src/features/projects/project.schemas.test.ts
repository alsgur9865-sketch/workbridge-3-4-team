import { createProjectSchema, projectListQuerySchema } from '@/features/projects/project.schemas';

const validProject = {
  title: '쇼핑몰 관리자 대시보드 개발',
  description: '주문과 재고를 한눈에 확인할 수 있는 반응형 관리자 화면을 개발합니다.',
  category: 'Web Development',
  budget: 5_000_000,
  recruitmentDeadline: '2030-01-10T09:00:00.000Z',
  workStartAt: '2030-01-15T09:00:00.000Z',
  workEndAt: '2030-03-01T09:00:00.000Z',
  skills: ['React', 'TypeScript'],
};

describe('project schemas', () => {
  it('parses list filters and pagination', () => {
    expect(
      projectListQuerySchema.parse({
        page: '2',
        limit: '9',
        status: 'OPEN',
        minBudget: '1000000',
        bookmarkedOnly: 'true',
      }),
    ).toEqual({
      page: 2,
      limit: 9,
      status: 'OPEN',
      minBudget: 1_000_000,
      sort: 'newest',
      bookmarkedOnly: true,
    });
  });

  it('accepts a valid project', () => {
    expect(createProjectSchema.parse(validProject)).toMatchObject(validProject);
  });

  it('rejects a recruitment deadline after the work start date', () => {
    const result = createProjectSchema.safeParse({
      ...validProject,
      recruitmentDeadline: '2030-01-20T09:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an invalid budget range', () => {
    const result = projectListQuerySchema.safeParse({
      minBudget: '5000000',
      maxBudget: '1000000',
    });

    expect(result.success).toBe(false);
  });
});
