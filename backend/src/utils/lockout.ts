import { redisClient } from '../middleware/rateLimiter';
import logger from './logger';

const LOCKOUT_PREFIX = 'mono-server:lockout:';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60; // 15 minutes

export async function checkLockout(email: string): Promise<boolean> {
    const key = `${LOCKOUT_PREFIX}${email}`;
    const attempts = await redisClient.get(key);

    if (attempts && parseInt(attempts, 10) >= MAX_ATTEMPTS) {
        return true;
    }
    return false;
}

export async function incrementFailedAttempts(email: string): Promise<number> {
    const key = `${LOCKOUT_PREFIX}${email}`;
    const attempts = await redisClient.incr(key);

    if (attempts === 1) {
        await redisClient.expire(key, LOCKOUT_DURATION);
    }

    logger.warn({ email, attempts }, 'Failed login attempt');
    return attempts;
}

export async function resetFailedAttempts(email: string): Promise<void> {
    const key = `${LOCKOUT_PREFIX}${email}`;
    await redisClient.del(key);
}

export async function getRemainingLockoutTime(email: string): Promise<number> {
    const key = `${LOCKOUT_PREFIX}${email}`;
    return await redisClient.ttl(key);
}
