import { cacheManager } from './CacheManager';
import logger from '../utils/logger';

export class CacheService {
    private static readonly PREFIX = 'mono-server:';
    private static readonly VERSION = 'v1:';

    private static buildKey(namespace: string, key: string): string {
        return `${this.PREFIX}${this.VERSION}${namespace}:${key}`;
    }

    static async get<T>(namespace: string, key: string): Promise<T | null> {
        const cacheKey = this.buildKey(namespace, key);
        const cached = await cacheManager.get(cacheKey);
        if (!cached) return null;
        try {
            return JSON.parse(cached) as T;
        } catch (err) {
            logger.error({ err, cacheKey }, 'Cache parse error');
            return null;
        }
    }

    static async set(namespace: string, key: string, value: unknown, ttl: number): Promise<void> {
        const cacheKey = this.buildKey(namespace, key);
        const serialized = JSON.stringify(value);
        await cacheManager.set(cacheKey, serialized, ttl);
    }

    static async invalidate(namespace: string, key: string): Promise<void> {
        const cacheKey = this.buildKey(namespace, key);
        await cacheManager.delete(cacheKey);
    }

    static isRedisAvailable(): boolean {
        return cacheManager.isRedisAvailable();
    }
}
