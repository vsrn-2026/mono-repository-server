import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import crypto from 'crypto';
import { Request as ExRequest } from 'express';
import logger from '../utils/logger';

export const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        return Math.min(times * 100, 3000);
    },
});

redisClient.on('error', (err) => {
    logger.error({ err }, 'Rate limiter Redis error');
});

function hashIdentifier(id: string): string {
    return crypto.createHash('sha256').update(id).digest('hex');
}

const keyGenerator = (req: ExRequest) => {
    const factors: string[] = [];
    const reqWithUser = req as ExRequest & { user?: { id: string } };

    if (reqWithUser.user?.id) {
        factors.push(`u:${reqWithUser.user.id}`);
    }

    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
        factors.push(`k:${hashIdentifier(String(apiKey))}`);
    }

    const deviceId = req.headers['x-device-id'];
    if (deviceId) {
        factors.push(`d:${hashIdentifier(String(deviceId))}`);
    }

    factors.push(`ip:${req.ip || 'unknown'}`);

    return factors.join('|');
};

export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    validate: false,
    keyGenerator,
    store: new RedisStore({
        sendCommand: async (...args: [string, ...string[]]) => redisClient.call(args[0], ...args.slice(1)) as Promise<number>,
        prefix: 'mono-server:ratelimit:',
    }),
    skip: () => redisClient.status !== 'ready',
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    validate: false,
    keyGenerator,
    store: new RedisStore({
        sendCommand: async (...args: [string, ...string[]]) => redisClient.call(args[0], ...args.slice(1)) as Promise<number>,
        prefix: 'mono-server:authratelimit:',
    }),
    skip: () => redisClient.status !== 'ready',
});
