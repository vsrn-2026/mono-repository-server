import Redis from 'ioredis';
import logger from './logger';

class RedisClient {
    private client: Redis | null = null;
    private isConnected = false;

    constructor() {
        this.connect();
    }

    private connect(): void {
        try {
            this.client = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                password: process.env.REDIS_PASSWORD || undefined,
                maxRetriesPerRequest: null,
                retryStrategy: (times) => {
                    return Math.min(times * 200, 1000);
                },
                lazyConnect: true,
            });

            this.client.on('connect', () => {
                this.isConnected = true;
                logger.info('Redis connected successfully');
            });

            this.client.on('error', (err) => {
                this.isConnected = false;
                logger.error({ err }, 'Redis connection error');
            });

            this.client.connect().catch((err) => {
                logger.error({ err }, 'Failed to connect to Redis');
            });
        } catch (err) {
            logger.error({ err }, 'Redis initialization failed');
        }
    }

    async get(key: string): Promise<string | null> {
        if (!this.isConnected || !this.client) return null;
        try {
            return await this.client.get(key);
        } catch (err) {
            logger.error({ err, key }, 'Redis GET failed');
            return null;
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<boolean> {
        if (!this.isConnected || !this.client) return false;
        try {
            if (ttl) {
                await this.client.setex(key, ttl, value);
            } else {
                await this.client.set(key, value);
            }
            return true;
        } catch (err) {
            logger.error({ err, key }, 'Redis SET failed');
            return false;
        }
    }

    async del(key: string): Promise<boolean> {
        if (!this.isConnected || !this.client) return false;
        try {
            await this.client.del(key);
            return true;
        } catch (err) {
            logger.error({ err, key }, 'Redis DEL failed');
            return false;
        }
    }

    async delPattern(pattern: string): Promise<number> {
        if (!this.isConnected || !this.client) return 0;
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length === 0) return 0;
            return await this.client.del(...keys);
        } catch (err) {
            logger.error({ err, pattern }, 'Redis DEL pattern failed');
            return 0;
        }
    }

    isAvailable(): boolean {
        return this.isConnected;
    }
}

const redis = new RedisClient();
export default redis;

export const getRedisConnection = () => {
    return new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
    });
};

export const getRedisClient = () => getRedisConnection();