import { CacheAdapter } from './CacheAdapter';
import { RedisCacheAdapter } from './RedisCacheAdapter';
import { MemoryCacheAdapter } from './MemoryCacheAdapter';
import logger from '../utils/logger';
import Redis from 'ioredis';

class CacheManager {
    private primary: CacheAdapter;
    private fallback: CacheAdapter;
    private currentAdapter: CacheAdapter;

    constructor() {
        this.primary = new RedisCacheAdapter();
        this.fallback = new MemoryCacheAdapter();
        this.currentAdapter = this.primary.isAvailable() ? this.primary : this.fallback;
    }

    private selectAdapter(): CacheAdapter {
        if (this.primary.isAvailable()) {
            if (this.currentAdapter !== this.primary) {
                logger.info('Switching to Redis cache');
                this.currentAdapter = this.primary;
            }
            return this.primary;
        }
        if (this.currentAdapter !== this.fallback) {
            logger.warn('Redis unavailable, using memory cache');
            this.currentAdapter = this.fallback;
        }
        return this.fallback;
    }

    async get(key: string): Promise<string | null> {
        try {
            return await this.selectAdapter().get(key);
        } catch (err) {
            logger.error({ err, key }, 'Cache GET failed');
            return null;
        }
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        try {
            await this.selectAdapter().set(key, value, ttl);
        } catch (err) {
            logger.error({ err, key }, 'Cache SET failed');
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.selectAdapter().delete(key);
        } catch (err) {
            logger.error({ err, key }, 'Cache DELETE failed');
        }
    }

    isRedisAvailable(): boolean {
        return this.primary.isAvailable();
    }

    getRedisClient(): Redis | null {
        if (this.primary instanceof RedisCacheAdapter && this.primary.isAvailable()) {
            return this.primary.getClient();
        }
        return null;
    }
}

export const cacheManager = new CacheManager();
export const getRedisClient = () => cacheManager.getRedisClient();
