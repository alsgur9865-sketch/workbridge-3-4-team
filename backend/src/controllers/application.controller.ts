import type { RequestHandler } from 'express';
import { getAuthUser } from '@/middlewares/auth.middleware';
import {
  applicationIdParamsSchema,
  applicationListQuerySchema,
  createApplicationSchema,
  projectIdParamsSchema,
  updateApplicationStatusSchema,
} from '@/schemas/application.schema';
import * as applicationService from '@/services/application.service';

export const applyToProject: RequestHandler = async (request, response) => {
  const { projectId } = projectIdParamsSchema.parse(request.params);
  const input = createApplicationSchema.parse(request.body);

  const application = await applicationService.applyToProject(
    getAuthUser(request),
    projectId,
    input,
  );
  response.status(201).json({ success: true, data: application });
};

export const listProjectApplications: RequestHandler = async (request, response) => {
  const { projectId } = projectIdParamsSchema.parse(request.params);
  const { status } = applicationListQuerySchema.parse(request.query);

  const applications = await applicationService.listProjectApplications(
    getAuthUser(request),
    projectId,
    status,
  );
  response.json({ success: true, data: applications });
};

export const listMyApplications: RequestHandler = async (request, response) => {
  const { status } = applicationListQuerySchema.parse(request.query);

  const applications = await applicationService.listMyApplications(getAuthUser(request), status);
  response.json({ success: true, data: applications });
};

export const getApplication: RequestHandler = async (request, response) => {
  const { applicationId } = applicationIdParamsSchema.parse(request.params);

  const application = await applicationService.getApplicationDetail(
    getAuthUser(request),
    applicationId,
  );
  response.json({ success: true, data: application });
};

export const decideApplication: RequestHandler = async (request, response) => {
  const { applicationId } = applicationIdParamsSchema.parse(request.params);
  const { status } = updateApplicationStatusSchema.parse(request.body);

  const application = await applicationService.decideApplication(
    getAuthUser(request),
    applicationId,
    status,
  );
  response.json({ success: true, data: application });
};
