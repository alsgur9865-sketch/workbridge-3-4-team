import { Router } from 'express';
import { authRouter } from '@/routes/auth.routes';
import { healthRouter } from '@/routes/health.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/health', healthRouter);
