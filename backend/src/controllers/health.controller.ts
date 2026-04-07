import { Controller, Get, Route, Tags, Hidden } from 'tsoa';
import getVersionInfo from '../utils/version';
import logger from '../utils/logger';
import prisma from '../utils/prisma';
import { getRedisClient } from '../cache/CacheManager';

interface ServiceStatus {
    status: 'up' | 'down' | 'degraded';
    message?: string;
}

interface HealthResponse {
    status: 'UP' | 'DEGRADED' | 'DOWN';
    timestamp: string;
    uptime: number;
    version: string;
    commit: string;
    buildTime: string;
    services: {
        database: ServiceStatus;
        redis: ServiceStatus;
    };
}

@Route('')
export class HealthController extends Controller {
    @Get('health')
    @Tags('Health')
    public async getHealth(): Promise<HealthResponse> {
        logger.info('Health check endpoint hit');
        const versionInfo = getVersionInfo();

        // Check database
        const dbStatus = await this.checkDatabase();
        
        // Check Redis
        const redisStatus = await this.checkRedis();

        // Determine overall status
        const allUp = dbStatus.status === 'up' && redisStatus.status === 'up';
        const anyDown = dbStatus.status === 'down' || redisStatus.status === 'down';
        
        const overallStatus = anyDown ? 'DOWN' : allUp ? 'UP' : 'DEGRADED';

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            ...versionInfo,
            services: {
                database: dbStatus,
                redis: redisStatus
            }
        };
    }

    private async checkDatabase(): Promise<ServiceStatus> {
        try {
            await prisma.user.findFirst();
            return { status: 'up' };
        } catch (error) {
            logger.error({ error }, 'Database health check failed');
            return { status: 'down', message: 'Database connection failed' };
        }
    }

    private async checkRedis(): Promise<ServiceStatus> {
        try {
            const redis = getRedisClient();
            if (!redis) {
                return { status: 'degraded', message: 'Using memory cache fallback' };
            }
            await redis.ping();
            return { status: 'up' };
        } catch (error) {
            logger.error({ error }, 'Redis health check failed');
            return { status: 'down', message: 'Redis connection failed' };
        }
    }

    @Hidden()
    @Get('/')
    public async getRoot(): Promise<string> {
        return 'mono-server Backend Server is running!';
    }
}
