import { Router } from 'express';
import { projectRouter } from '@/features/projects/project.routes';
import { applicationRouter } from '@/routes/application.routes';
import { authRouter } from '@/routes/auth.routes';
import { healthRouter } from '@/routes/health.routes';
import { priceOfferRouter } from '@/routes/price-offer.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use(applicationRouter);
apiRouter.use(priceOfferRouter);
