import { cacheManager } from '../../cache/CacheManager';
import { RedisCacheAdapter } from '../../cache/RedisCacheAdapter';
import { MemoryCacheAdapter } from '../../cache/MemoryCacheAdapter';

jest.mock('../../cache/RedisCacheAdapter');
jest.mock('../../cache/MemoryCacheAdapter');

describe('CacheManager', () => {
    let mockRedisAdapter: jest.Mocked<RedisCacheAdapter>;
    let mockMemoryAdapter: jest.Mocked<MemoryCacheAdapter>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRedisAdapter = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            isAvailable: jest.fn(),
        } as any;

        mockMemoryAdapter = {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            isAvailable: jest.fn().mockReturnValue(true),
        } as any;

        (RedisCacheAdapter as jest.Mock).mockImplementation(() => mockRedisAdapter);
        (MemoryCacheAdapter as jest.Mock).mockImplementation(() => mockMemoryAdapter);
    });

    describe('adapter selection', () => {
        it('should use Redis when available', async () => {
            mockRedisAdapter.isAvailable.mockReturnValue(true);
            mockRedisAdapter.get.mockResolvedValue('redis-value');

            const manager = new (cacheManager as any)();
            const result = await manager.get('test-key');

            expect(result).toBe('redis-value');
            expect(mockRedisAdapter.get).toHaveBeenCalledWith('test-key');
            expect(mockMemoryAdapter.get).not.toHaveBeenCalled();
        });

        it('should fallback to memory when Redis unavailable', async () => {
            mockRedisAdapter.isAvailable.mockReturnValue(false);
            mockMemoryAdapter.get.mockResolvedValue('memory-value');

            const manager = new (cacheManager as any)();
            const result = await manager.get('test-key');

            expect(result).toBe('memory-value');
            expect(mockMemoryAdapter.get).toHaveBeenCalledWith('test-key');
        });

        it('should switch to Redis when it becomes available', async () => {
            mockRedisAdapter.isAvailable
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);
            mockRedisAdapter.get.mockResolvedValue('redis-value');

            const manager = new (cacheManager as any)();

            await manager.get('key1');
            await manager.get('key2');

            expect(mockRedisAdapter.get).toHaveBeenCalledWith('key2');
        });
    });

    describe('get', () => {
        it('should return null on error', async () => {
            mockRedisAdapter.isAvailable.mockReturnValue(true);
            mockRedisAdapter.get.mockRejectedValue(new Error('Connection error'));

            const manager = new (cacheManager as any)();
            const result = await manager.get('test-key');

            expect(result).toBeNull();
        });
    });

    describe('set', () => {
        it('should set value with TTL', async () => {
            mockRedisAdapter.isAvailable.mockReturnValue(true);
            mockRedisAdapter.set.mockResolvedValue(undefined);

            const manager = new (cacheManager as any)();
            await manager.set('test-key', 'test-value', 3600);

            expect(mockRedisAdapter.set).toHaveBeenCalledWith('test-key', 'test-value', 3600);
        });

        it('should not throw on error', async () => {
            mockRedisAdapter.isAvailable.mockReturnValue(true);
            mockRedisAdapter.set.mockRejectedValue(new Error('Write error'));

            const manager = new (cacheManager as any)();

            await expect(manager.set('test-key', 'value', 100)).resolves.not.toThrow();
        });
    });

    describe('delete', () => {
        it('should delete key', async () => {
            mockRedisAdapter.isAvailable.mockReturnValue(true);
            mockRedisAdapter.delete.mockResolvedValue(undefined);

            const manager = new (cacheManager as any)();
            await manager.delete('test-key');

            expect(mockRedisAdapter.delete).toHaveBeenCalledWith('test-key');
        });

        it('should not throw on error', async () => {
            mockRedisAdapter.isAvailable.mockReturnValue(true);
            mockRedisAdapter.delete.mockRejectedValue(new Error('Delete error'));

            const manager = new (cacheManager as any)();

            await expect(manager.delete('test-key')).resolves.not.toThrow();
        });
    });

    describe('isRedisAvailable', () => {
        it('should return true when Redis is available', () => {
            mockRedisAdapter.isAvailable.mockReturnValue(true);

            const manager = new (cacheManager as any)();
            const result = manager.isRedisAvailable();

            expect(result).toBe(true);
        });

        it('should return false when Redis is unavailable', () => {
            mockRedisAdapter.isAvailable.mockReturnValue(false);

            const manager = new (cacheManager as any)();
            const result = manager.isRedisAvailable();

            expect(result).toBe(false);
        });
    });
});
