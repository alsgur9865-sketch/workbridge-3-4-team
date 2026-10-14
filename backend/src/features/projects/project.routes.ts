import { Router } from 'express';
import { getAuthUser, optionalAuth, requireAuth, requireRole } from '@/middlewares/auth.middleware';
import {
  createProjectSchema,
  priceEstimateInputSchema,
  projectIdSchema,
  projectListQuerySchema,
  updateProjectSchema,
} from '@/features/projects/project.schemas';
import { estimateProjectPrice } from '@/features/projects/price-analysis.service';
import {
  addProjectBookmark,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  recommendProjects,
  removeProjectBookmark,
  updateProject,
} from '@/features/projects/project.service';

export const projectRouter = Router();

projectRouter.get(
  '/recommended',
  requireAuth,
  requireRole('FREELANCER'),
  async (request, response) => {
    const result = await recommendProjects(getAuthUser(request).id);
    response.json({ success: true, ...result });
  },
);

projectRouter.get('/', optionalAuth, async (request, response) => {
  const query = projectListQuerySchema.parse(request.query);
  const result = await listProjects(query, request.user?.id);
  response.json({ success: true, ...result });
});

projectRouter.post(
  '/price-estimate',
  requireAuth,
  requireRole('CLIENT'),
  async (request, response) => {
    const client = getAuthUser(request);
    const input = priceEstimateInputSchema.parse(request.body);
    const result = await estimateProjectPrice(client.id, input);
    response.json({ success: true, data: result });
  },
);

projectRouter.post('/:projectId/bookmark', requireAuth, async (request, response) => {
  const user = getAuthUser(request);
  const projectId = projectIdSchema.parse(request.params.projectId);
  await addProjectBookmark(projectId, user.id);
  response.status(201).json({ success: true, data: { isBookmarked: true } });
});

projectRouter.delete('/:projectId/bookmark', requireAuth, async (request, response) => {
  const user = getAuthUser(request);
  const projectId = projectIdSchema.parse(request.params.projectId);
  await removeProjectBookmark(projectId, user.id);
  response.status(204).send();
});

projectRouter.get('/:projectId', optionalAuth, async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.projectId);
  const project = await getProject(projectId, request.user?.id);
  response.json({ success: true, data: project });
});

projectRouter.post('/', requireAuth, requireRole('CLIENT'), async (request, response) => {
  const client = getAuthUser(request);
  const input = createProjectSchema.parse(request.body);
  const project = await createProject(client.id, input);
  response.status(201).json({ success: true, data: project });
});

projectRouter.patch(
  '/:projectId',
  requireAuth,
  requireRole('CLIENT'),
  async (request, response) => {
    const client = getAuthUser(request);
    const projectId = projectIdSchema.parse(request.params.projectId);
    const input = updateProjectSchema.parse(request.body);
    const project = await updateProject(projectId, client.id, input);
    response.json({ success: true, data: project });
  },
);

projectRouter.delete(
  '/:projectId',
  requireAuth,
  requireRole('CLIENT'),
  async (request, response) => {
    const client = getAuthUser(request);
    const projectId = projectIdSchema.parse(request.params.projectId);
    await deleteProject(projectId, client.id);
    response.status(204).send();
  },
);
