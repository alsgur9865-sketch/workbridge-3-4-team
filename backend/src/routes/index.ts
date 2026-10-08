import { Router } from 'express';
import { applicationRouter } from '@/routes/application.routes';
import { authRouter } from '@/routes/auth.routes';
import { healthRouter } from '@/routes/health.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use(applicationRouter);
