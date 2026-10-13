import { getRecruitmentStatus } from './recruitment-status';

const now = new Date('2030-01-10T00:00:00Z');
const project = {
  recruitmentStartAt: new Date('2030-01-09T00:00:00Z'),
  recruitmentDeadline: new Date('2030-01-11T00:00:00Z'),
  closedAt: null,
  selectedApplicationId: null,
  transactionStatus: 'NONE',
  deletedAt: null,
};

describe('recruitment status at the time of a request', () => {
  it('opens exactly at the start time and closes exactly at the deadline', () => {
    expect(getRecruitmentStatus(project, project.recruitmentStartAt)).toBe('OPEN');
    expect(getRecruitmentStatus(project, project.recruitmentDeadline)).toBe('CLOSED');
    expect(getRecruitmentStatus(project, new Date('2030-01-08'))).toBe('SCHEDULED');
    expect(getRecruitmentStatus({ ...project, recruitmentStartAt: null }, now)).toBe('OPEN');
  });

  it.each([
    { closedAt: now },
    { selectedApplicationId: 'selected-application' },
    { transactionStatus: 'PRICE_AGREEMENT' },
    { transactionStatus: 'CANCELLED' },
    { deletedAt: now },
  ])('does not reopen a finished project: %j', (override) => {
    expect(getRecruitmentStatus({ ...project, ...override }, now)).toBe('CLOSED');
  });
});
