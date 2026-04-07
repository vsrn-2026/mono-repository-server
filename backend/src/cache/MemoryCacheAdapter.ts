 
import { CacheAdapter } from './CacheAdapter';

interface CacheEntry {
    value: string;
    expiresAt: number;
}

export class MemoryCacheAdapter implements CacheAdapter {
    private cache = new Map<string, CacheEntry>();
    private cleanupInterval: ReturnType<typeof setInterval>;

    constructor() {
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
    }

    async get(key: string): Promise<string | null> {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key: string, value: string, ttl?: number): Promise<void> {
        const expiresAt = ttl ? Date.now() + ttl * 1000 : Date.now() + 3600000;
        this.cache.set(key, { value, expiresAt });
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key);
    }

    isAvailable(): boolean {
        return true;
    }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.cache.clear();
    }
}
