import { CacheService } from '../../cache/CacheService';
import { cacheManager } from '../../cache/CacheManager';

jest.mock('../../cache/CacheManager', () => ({
    cacheManager: {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
        isRedisAvailable: jest.fn(),
    },
}));

describe('CacheService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('get', () => {
        it('should retrieve and parse cached data', async () => {
            const mockData = { id: '123', name: 'test' };
            (cacheManager.get as jest.Mock).mockResolvedValue(JSON.stringify(mockData));

            const result = await CacheService.get<typeof mockData>('users', 'user123');

            expect(result).toEqual(mockData);
            expect(cacheManager.get).toHaveBeenCalledWith('mono-server:v1:users:user123');
        });

        it('should return null when cache miss', async () => {
            (cacheManager.get as jest.Mock).mockResolvedValue(null);

            const result = await CacheService.get('users', 'user123');

            expect(result).toBeNull();
        });

        it('should return null on parse error', async () => {
            (cacheManager.get as jest.Mock).mockResolvedValue('invalid-json');

            const result = await CacheService.get('users', 'user123');

            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('should serialize and cache data with TTL', async () => {
            const mockData = { id: '123', name: 'test' };
            (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

            await CacheService.set('users', 'user123', mockData, 3600);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'mono-server:v1:users:user123',
                JSON.stringify(mockData),
                3600
            );
        });

        it('should handle complex nested objects', async () => {
            const complexData = {
                user: { id: '123', profile: { name: 'test', tags: ['a', 'b'] } },
                metadata: { created: new Date().toISOString() },
            };

            await CacheService.set('users', 'user123', complexData, 3600);

            expect(cacheManager.set).toHaveBeenCalledWith(
                'mono-server:v1:users:user123',
                JSON.stringify(complexData),
                3600
            );
        });
    });

    describe('invalidate', () => {
        it('should delete cache entry', async () => {
            (cacheManager.delete as jest.Mock).mockResolvedValue(undefined);

            await CacheService.invalidate('users', 'user123');

            expect(cacheManager.delete).toHaveBeenCalledWith('mono-server:v1:users:user123');
        });
    });

    describe('isRedisAvailable', () => {
        it('should return true when Redis is available', () => {
            (cacheManager.isRedisAvailable as jest.Mock).mockReturnValue(true);

            const result = CacheService.isRedisAvailable();

            expect(result).toBe(true);
        });

        it('should return false when Redis is unavailable', () => {
            (cacheManager.isRedisAvailable as jest.Mock).mockReturnValue(false);

            const result = CacheService.isRedisAvailable();

            expect(result).toBe(false);
        });
    });

    describe('key generation', () => {
        it('should generate consistent keys with prefix and version', async () => {
            (cacheManager.get as jest.Mock).mockResolvedValue(null);

            await CacheService.get('namespace', 'key');

            expect(cacheManager.get).toHaveBeenCalledWith('mono-server:v1:namespace:key');
        });

        it('should handle different namespaces', async () => {
            (cacheManager.set as jest.Mock).mockResolvedValue(undefined);

            await CacheService.set('users', 'key1', 'value1', 100);
            await CacheService.set('sessions', 'key2', 'value2', 200);

            expect(cacheManager.set).toHaveBeenCalledWith('mono-server:v1:users:key1', '"value1"', 100);
            expect(cacheManager.set).toHaveBeenCalledWith('mono-server:v1:sessions:key2', '"value2"', 200);
        });
    });
});
