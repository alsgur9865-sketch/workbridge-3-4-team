import { AppError } from '@/errors/AppError';
import { Prisma } from '@/generated/prisma/client';
import { getPrisma } from '@/lib/prisma';
import type { ApplicationStatusValue, CreateApplicationInput } from '@/schemas/application.schema';

const freelancerSummarySelect = {
  id: true,
  name: true,
  profileImageUrl: true,
  freelancerProfile: {
    select: { mainCategory: true, careerYears: true },
  },
} as const;

const projectSummarySelect = {
  id: true,
  title: true,
  budget: true,
  recruitmentStatus: true,
  recruitmentStartAt: true,
  recruitmentDeadline: true,
  closedAt: true,
  selectedApplicationId: true,
  transactionStatus: true,
} as const;

export function findProjectForApplication(projectId: string) {
  return getPrisma().project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      clientId: true,
      title: true,
      recruitmentStatus: true,
      recruitmentStartAt: true,
      closedAt: true,
      recruitmentDeadline: true,
      transactionStatus: true,
      selectedApplicationId: true,
      deletedAt: true,
    },
  });
}

export function findApplicationByProjectAndFreelancer(projectId: string, freelancerId: string) {
  return getPrisma().application.findUnique({
    where: { projectId_freelancerId: { projectId, freelancerId } },
    select: { id: true },
  });
}

export async function createApplication(params: {
  projectId: string;
  projectTitle: string;
  clientId: string;
  freelancerId: string;
  input: CreateApplicationInput;
}) {
  const { projectId, projectTitle, clientId, freelancerId, input } = params;

  try {
    return await getPrisma().$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          projectId,
          freelancerId,
          introduction: input.introduction,
          proposedAmount: input.proposedAmount,
          estimatedDays: input.estimatedDays,
        },
      });

      await tx.notification.create({
        data: {
          userId: clientId,
          type: 'NEW_APPLICATION',
          title: '새 지원자가 있습니다',
          message: `'${projectTitle}' 프로젝트에 새로운 지원서가 도착했습니다.`,
          targetUrl: `/projects/${projectId}/applications`,
        },
      });

      return application;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'ALREADY_APPLIED', 'You have already applied to this project.');
    }
    throw error;
  }
}

export function listApplicationsByProject(projectId: string, status?: ApplicationStatusValue) {
  return getPrisma().application.findMany({
    where: { projectId, ...(status ? { status } : {}) },
    include: { freelancer: { select: freelancerSummarySelect } },
    orderBy: { createdAt: 'desc' },
  });
}

export function listApplicationsByFreelancer(
  freelancerId: string,
  status?: ApplicationStatusValue,
) {
  return getPrisma().application.findMany({
    where: {
      freelancerId,
      project: { deletedAt: null },
      ...(status ? { status } : {}),
    },
    include: { project: { select: projectSummarySelect } },
    orderBy: { createdAt: 'desc' },
  });
}

export function findApplicationWithProject(applicationId: string) {
  return getPrisma().application.findUnique({
    where: { id: applicationId },
    include: {
      project: {
        select: {
          id: true,
          clientId: true,
          title: true,
          transactionStatus: true,
          selectedApplicationId: true,
          deletedAt: true,
        },
      },
    },
  });
}

export function findApplicationDetail(applicationId: string) {
  return getPrisma().application.findUnique({
    where: { id: applicationId },
    include: {
      freelancer: { select: freelancerSummarySelect },
      project: {
        select: {
          ...projectSummarySelect,
          clientId: true,
          workStartAt: true,
          workEndAt: true,
          selectedApplicationId: true,
          deletedAt: true,
        },
      },
    },
  });
}

/**
 * Accepts one application and closes recruitment in a single transaction:
 * the project records the selected application, moves to PRICE_AGREEMENT,
 * and every other pending application is auto-rejected.
 */
export async function acceptApplication(params: {
  applicationId: string;
  projectId: string;
  projectTitle: string;
  freelancerId: string;
}) {
  const { applicationId, projectId, projectTitle, freelancerId } = params;
  const now = new Date();

  return getPrisma().$transaction(async (tx) => {
    const accepted = await tx.application.updateMany({
      where: { id: applicationId, status: 'PENDING' },
      data: { status: 'ACCEPTED', respondedAt: now },
    });
    if (accepted.count === 0) {
      throw new AppError(
        409,
        'APPLICATION_ALREADY_PROCESSED',
        'This application was already processed.',
      );
    }

    const project = await tx.project.updateMany({
      where: { id: projectId, selectedApplicationId: null, transactionStatus: 'NONE' },
      data: {
        selectedApplicationId: applicationId,
        recruitmentStatus: 'CLOSED',
        transactionStatus: 'PRICE_AGREEMENT',
        closedAt: now,
      },
    });
    if (project.count === 0) {
      throw new AppError(409, 'APPLICANT_ALREADY_SELECTED', 'An applicant was already selected.');
    }

    const others = await tx.application.findMany({
      where: { projectId, status: 'PENDING', id: { not: applicationId } },
      select: { id: true, freelancerId: true },
    });
    if (others.length > 0) {
      await tx.application.updateMany({
        where: { id: { in: others.map((other) => other.id) } },
        data: { status: 'REJECTED', respondedAt: now },
      });
    }

    await tx.notification.createMany({
      data: [
        {
          userId: freelancerId,
          type: 'APPLICATION_ACCEPTED',
          title: '지원이 수락되었습니다',
          message: `'${projectTitle}' 프로젝트에 선정되었습니다. 금액 협의를 진행해 주세요.`,
          targetUrl: '/applications/me',
        },
        ...others.map((other) => ({
          userId: other.freelancerId,
          type: 'APPLICATION_AUTO_REJECTED' as const,
          title: '모집이 마감되었습니다',
          message: `'${projectTitle}' 프로젝트에 다른 지원자가 선정되었습니다.`,
          targetUrl: '/applications/me',
        })),
      ],
    });

    return tx.application.findUniqueOrThrow({ where: { id: applicationId } });
  });
}

export async function rejectApplication(params: {
  applicationId: string;
  projectTitle: string;
  freelancerId: string;
}) {
  const { applicationId, projectTitle, freelancerId } = params;

  return getPrisma().$transaction(async (tx) => {
    const rejected = await tx.application.updateMany({
      where: { id: applicationId, status: 'PENDING' },
      data: { status: 'REJECTED', respondedAt: new Date() },
    });
    if (rejected.count === 0) {
      throw new AppError(
        409,
        'APPLICATION_ALREADY_PROCESSED',
        'This application was already processed.',
      );
    }

    await tx.notification.create({
      data: {
        userId: freelancerId,
        type: 'APPLICATION_REJECTED',
        title: '지원 결과 안내',
        message: `'${projectTitle}' 프로젝트 지원이 거절되었습니다.`,
        targetUrl: '/applications/me',
      },
    });

    return tx.application.findUniqueOrThrow({ where: { id: applicationId } });
  });
}
