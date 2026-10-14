import { Router } from 'express';
import { createDeliveryRouter } from '@/features/deliveries/delivery.routes';
import { projectRouter } from '@/features/projects/project.routes';
import { applicationRouter } from '@/routes/application.routes';
import { authRouter } from '@/routes/auth.routes';
import { contractRouter } from '@/routes/contract.routes';
import { healthRouter } from '@/routes/health.routes';
import { notificationRouter } from '@/routes/notification.routes';
import { paymentRouter } from '@/routes/payment.routes';
import { priceOfferRouter } from '@/routes/price-offer.routes';
import { reviewRouter } from '@/routes/review.routes';
import { userRouter } from '@/routes/user.routes';
import { releasePaymentForContract } from '@/services/payment.service';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/projects', projectRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/contracts', contractRouter);
apiRouter.use(createDeliveryRouter(releasePaymentForContract));
apiRouter.use(applicationRouter);
apiRouter.use(priceOfferRouter);
apiRouter.use(paymentRouter);
apiRouter.use(reviewRouter);
