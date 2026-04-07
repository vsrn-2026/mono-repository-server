 
import { Server } from 'http';
import logger from './logger';
import prisma from './prisma';
import { getRedisClient } from './redis';

let isShuttingDown = false;

export const gracefulShutdown = (server: Server) => {
    const shutdown = async (signal: string) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        logger.info(`${signal} received, starting graceful shutdown`);

        server.close(async () => {
            logger.info('HTTP server closed');

            try {
                await prisma.$disconnect();
                logger.info('Database connection closed');

                const redis = getRedisClient();
                await redis.quit();
                logger.info('Redis connection closed');

                process.exit(0);
            } catch (error) {
                logger.error({ error }, 'Error during shutdown');
                process.exit(1);
            }
        });

        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};
