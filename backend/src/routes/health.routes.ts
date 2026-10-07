import { Router } from 'express';
import { getPrisma } from '@/lib/prisma';

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check API status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is available
 */
healthRouter.get('/', (_request, response) => {
  response.json({
    success: true,
    service: 'workbridge-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @openapi
 * /health/database:
 *   get:
 *     summary: Check database connectivity
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database is available
 *       503:
 *         description: Database is unavailable
 */
healthRouter.get('/database', async (_request, response) => {
  try {
    const prisma = getPrisma();
    await prisma.$queryRawUnsafe('SELECT 1');
    response.json({
      success: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    response.status(503).json({
      success: false,
      database: 'unavailable',
      message: error instanceof Error ? error.message : 'Unknown database error',
    });
  }
});
