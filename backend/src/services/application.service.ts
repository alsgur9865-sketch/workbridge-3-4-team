import { AppError } from '@/errors/AppError';
import * as applicationRepository from '@/repositories/application.repository';
import type {
  ApplicationDecision,
  ApplicationStatusValue,
  CreateApplicationInput,
} from '@/schemas/application.schema';
import type { AuthUser } from '@/types/auth';

type ApplicationRecord = Awaited<ReturnType<typeof applicationRepository.createApplication>>;
type ProjectApplicationRecord = Awaited<
  ReturnType<typeof applicationRepository.listApplicationsByProject>
>[number];
type MyApplicationRecord = Awaited<
  ReturnType<typeof applicationRepository.listApplicationsByFreelancer>
>[number];

export function toApplicationDto(application: ApplicationRecord) {
  return {
    id: application.id,
    projectId: application.projectId,
    freelancerId: application.freelancerId,
    introduction: application.introduction,
    proposedAmount: Number(application.proposedAmount),
    estimatedDays: application.estimatedDays,
    status: application.status,
    clientOfferAmount:
      application.clientOfferAmount === null ? null : Number(application.clientOfferAmount),
    priceOfferStatus: application.priceOfferStatus,
    offeredAt: application.offeredAt,
    respondedAt: application.respondedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

function toProjectApplicationDto(application: ProjectApplicationRecord) {
  return {
    ...toApplicationDto(application),
    freelancer: {
      id: application.freelancer.id,
      name: application.freelancer.name,
      profileImageUrl: application.freelancer.profileImageUrl,
      mainCategory: application.freelancer.freelancerProfile?.mainCategory ?? null,
      careerYears: application.freelancer.freelancerProfile?.careerYears ?? null,
    },
  };
}

function toMyApplicationDto(application: MyApplicationRecord) {
  return {
    ...toApplicationDto(application),
    project: {
      id: application.project.id,
      title: application.project.title,
      budget: Number(application.project.budget),
      recruitmentStatus: application.project.recruitmentStatus,
      transactionStatus: application.project.transactionStatus,
    },
  };
}

async function getActiveProject(projectId: string) {
  const project = await applicationRepository.findProjectForApplication(projectId);
  if (!project || project.deletedAt) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'The project does not exist.');
  }
  return project;
}

export async function applyToProject(
  user: AuthUser,
  projectId: string,
  input: CreateApplicationInput,
) {
  const project = await getActiveProject(projectId);

  if (project.clientId === user.id) {
    throw new AppError(403, 'CANNOT_APPLY_OWN_PROJECT', 'You cannot apply to your own project.');
  }

  if (project.recruitmentStatus !== 'OPEN' || project.recruitmentDeadline.getTime() < Date.now()) {
    throw new AppError(409, 'RECRUITMENT_CLOSED', 'The project is not accepting applications.');
  }

  const existing = await applicationRepository.findApplicationByProjectAndFreelancer(
    projectId,
    user.id,
  );
  if (existing) {
    throw new AppError(409, 'ALREADY_APPLIED', 'You have already applied to this project.');
  }

  const application = await applicationRepository.createApplication({
    projectId,
    projectTitle: project.title,
    clientId: project.clientId,
    freelancerId: user.id,
    input,
  });
  return toApplicationDto(application);
}

export async function listProjectApplications(
  user: AuthUser,
  projectId: string,
  status?: ApplicationStatusValue,
) {
  const project = await getActiveProject(projectId);

  if (project.clientId !== user.id) {
    throw new AppError(403, 'NOT_PROJECT_OWNER', 'Only the project owner can view applications.');
  }

  const applications = await applicationRepository.listApplicationsByProject(projectId, status);
  return applications.map(toProjectApplicationDto);
}

export async function listMyApplications(user: AuthUser, status?: ApplicationStatusValue) {
  const applications = await applicationRepository.listApplicationsByFreelancer(user.id, status);
  return applications.map(toMyApplicationDto);
}

export async function getApplicationDetail(user: AuthUser, applicationId: string) {
  const application = await applicationRepository.findApplicationDetail(applicationId);
  if (!application || application.project.deletedAt) {
    throw new AppError(404, 'APPLICATION_NOT_FOUND', 'The application does not exist.');
  }

  const { project } = application;
  if (project.clientId !== user.id && application.freelancerId !== user.id) {
    throw new AppError(
      403,
      'NOT_APPLICATION_PARTICIPANT',
      'Only the project owner or the applicant can view this application.',
    );
  }

  return {
    ...toProjectApplicationDto(application),
    project: {
      id: project.id,
      title: project.title,
      budget: Number(project.budget),
      clientId: project.clientId,
      recruitmentStatus: project.recruitmentStatus,
      transactionStatus: project.transactionStatus,
      workStartAt: project.workStartAt,
      workEndAt: project.workEndAt,
      isSelected: project.selectedApplicationId === application.id,
    },
    contract: application.contract,
  };
}

export async function decideApplication(
  user: AuthUser,
  applicationId: string,
  decision: ApplicationDecision,
) {
  const application = await applicationRepository.findApplicationWithProject(applicationId);
  if (!application || application.project.deletedAt) {
    throw new AppError(404, 'APPLICATION_NOT_FOUND', 'The application does not exist.');
  }

  const { project } = application;
  if (project.clientId !== user.id) {
    throw new AppError(403, 'NOT_PROJECT_OWNER', 'Only the project owner can decide applications.');
  }

  if (application.status !== 'PENDING') {
    throw new AppError(
      409,
      'APPLICATION_ALREADY_PROCESSED',
      'This application was already processed.',
    );
  }

  if (decision === 'REJECTED') {
    const rejected = await applicationRepository.rejectApplication({
      applicationId,
      projectTitle: project.title,
      freelancerId: application.freelancerId,
    });
    return toApplicationDto(rejected);
  }

  if (project.selectedApplicationId || project.transactionStatus !== 'NONE') {
    throw new AppError(409, 'APPLICANT_ALREADY_SELECTED', 'An applicant was already selected.');
  }

  const accepted = await applicationRepository.acceptApplication({
    applicationId,
    projectId: project.id,
    projectTitle: project.title,
    freelancerId: application.freelancerId,
  });
  return toApplicationDto(accepted);
}
