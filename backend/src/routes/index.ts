import { Router } from 'express';
import { projectRouter } from '@/features/projects/project.routes';
import { applicationRouter } from '@/routes/application.routes';
import { healthRouter } from '@/routes/health.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use(applicationRouter);
