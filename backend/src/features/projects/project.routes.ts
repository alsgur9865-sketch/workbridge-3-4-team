import { Router } from 'express';
import {
  getOptionalProjectUser,
  requireProjectClient,
  requireProjectUser,
} from '@/features/projects/project-access';
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
  removeProjectBookmark,
  updateProject,
} from '@/features/projects/project.service';

export const projectRouter = Router();

projectRouter.get('/', async (request, response) => {
  const query = projectListQuerySchema.parse(request.query);
  const viewer = await getOptionalProjectUser(request);
  const result = await listProjects(query, viewer?.id);
  response.json({ success: true, ...result });
});

projectRouter.post('/price-estimate', async (request, response) => {
  const client = await requireProjectClient(request);
  const input = priceEstimateInputSchema.parse(request.body);
  const result = await estimateProjectPrice(client.id, input);
  response.json({ success: true, data: result });
});

projectRouter.post('/:projectId/bookmark', async (request, response) => {
  const user = await requireProjectUser(request);
  const projectId = projectIdSchema.parse(request.params.projectId);
  await addProjectBookmark(projectId, user.id);
  response.status(201).json({ success: true, data: { isBookmarked: true } });
});

projectRouter.delete('/:projectId/bookmark', async (request, response) => {
  const user = await requireProjectUser(request);
  const projectId = projectIdSchema.parse(request.params.projectId);
  await removeProjectBookmark(projectId, user.id);
  response.status(204).send();
});

projectRouter.get('/:projectId', async (request, response) => {
  const projectId = projectIdSchema.parse(request.params.projectId);
  const viewer = await getOptionalProjectUser(request);
  const project = await getProject(projectId, viewer?.id);
  response.json({ success: true, data: project });
});

projectRouter.post('/', async (request, response) => {
  const client = await requireProjectClient(request);
  const input = createProjectSchema.parse(request.body);
  const project = await createProject(client.id, input);
  response.status(201).json({ success: true, data: project });
});

projectRouter.patch('/:projectId', async (request, response) => {
  const client = await requireProjectClient(request);
  const projectId = projectIdSchema.parse(request.params.projectId);
  const input = updateProjectSchema.parse(request.body);
  const project = await updateProject(projectId, client.id, input);
  response.json({ success: true, data: project });
});

projectRouter.delete('/:projectId', async (request, response) => {
  const client = await requireProjectClient(request);
  const projectId = projectIdSchema.parse(request.params.projectId);
  await deleteProject(projectId, client.id);
  response.status(204).send();
});
