import 'dotenv/config';
import { app } from '@/app';
import { env } from '@/config/env';
import { disconnectPrisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'WorkBridge API started');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down WorkBridge API');
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
