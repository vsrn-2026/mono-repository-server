import Redis from 'ioredis';
import { CacheAdapter } from './CacheAdapter';
import logger from '../utils/logger';

export class RedisCacheAdapter implements CacheAdapter {
    private client: Redis;
    private available = false;

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null,
            retryStrategy: (times) => {
                return Math.min(times * 100, 3000);
            },
            lazyConnect: true,
        });

        this.client.on('connect', () => {
            this.available = true;
            logger.info('Redis connected');
        });

        this.client.on('error', (err) => {
            this.available = false;
            logger.error({ err }, 'Redis error');
        });

        this.client.on('reconnecting', () => {
            logger.info('Redis reconnecting');
        });

        this.client.connect().catch((err) => {
            this.available = false;
            logger.error({ err }, 'Redis connection failed');
        });
    }

    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (err) {
            logger.error({ err, key }, 'Redis GET failed');
            this.available = false;
            return null;
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        try {
            if (ttl) {
                await this.client.setex(key, ttl, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (err) {
            logger.error({ err, key }, 'Redis SET failed');
            this.available = false;
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (err) {
            logger.error({ err, key }, 'Redis DELETE failed');
            this.available = false;
        }
    }

    isAvailable(): boolean {
        return this.available && this.client.status === 'ready';
    }

    getClient(): Redis {
        return this.client;
    }
}
