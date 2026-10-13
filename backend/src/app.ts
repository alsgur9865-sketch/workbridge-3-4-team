import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import passport from 'passport';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { allowedOrigins } from '@/config/env';
import { openApiSpec } from '@/config/openapi';
import { configurePassport } from '@/config/passport';
import { errorHandler } from '@/middlewares/error-handler';
import { notFound } from '@/middlewares/not-found';
import { logger } from '@/lib/logger';
import { apiRouter } from '@/routes';

export const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Google OAuth Passport Strategy 등록
configurePassport();

app.use(helmet());

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS.'));
    },
  }),
);

app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// Passport 초기화
app.use(passport.initialize());

app.use(
  '/api/v1/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/', (_request, response) => {
  response.redirect('/api-docs');
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec),
);

app.use('/api/v1', apiRouter);

app.use(notFound);
app.use(errorHandler);