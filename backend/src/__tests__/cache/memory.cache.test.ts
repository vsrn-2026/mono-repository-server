import { MemoryCacheAdapter } from '../../cache/MemoryCacheAdapter';

describe('MemoryCacheAdapter', () => {
    let adapter: MemoryCacheAdapter;

    beforeEach(() => {
        adapter = new MemoryCacheAdapter();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('get and set', () => {
        it('should store and retrieve values', async () => {
            await adapter.set('key1', 'value1', 3600);
            const result = await adapter.get('key1');

            expect(result).toBe('value1');
        });

        it('should return null for non-existent keys', async () => {
            const result = await adapter.get('nonexistent');

            expect(result).toBeNull();
        });

        it('should handle multiple keys', async () => {
            await adapter.set('key1', 'value1', 3600);
            await adapter.set('key2', 'value2', 3600);

            expect(await adapter.get('key1')).toBe('value1');
            expect(await adapter.get('key2')).toBe('value2');
        });
    });

    describe('TTL expiration', () => {
        it('should expire entries after TTL', async () => {
            await adapter.set('key1', 'value1', 1);

            expect(await adapter.get('key1')).toBe('value1');

            jest.advanceTimersByTime(1500);

            expect(await adapter.get('key1')).toBeNull();
        });

        it('should not expire entries before TTL', async () => {
            await adapter.set('key1', 'value1', 10);

            jest.advanceTimersByTime(5000);

            expect(await adapter.get('key1')).toBe('value1');
        });

        it('should handle entries without TTL', async () => {
            await adapter.set('key1', 'value1');

            jest.advanceTimersByTime(100000);

            expect(await adapter.get('key1')).toBe('value1');
        });
    });

    describe('delete', () => {
        it('should delete existing keys', async () => {
            await adapter.set('key1', 'value1', 3600);
            await adapter.delete('key1');

            expect(await adapter.get('key1')).toBeNull();
        });

        it('should not throw on deleting non-existent keys', async () => {
            await expect(adapter.delete('nonexistent')).resolves.not.toThrow();
        });
    });

    describe('isAvailable', () => {
        it('should always return true', () => {
            expect(adapter.isAvailable()).toBe(true);
        });
    });

    describe('cleanup', () => {
        it('should remove expired entries during cleanup', async () => {
            await adapter.set('key1', 'value1', 1);
            await adapter.set('key2', 'value2', 100);

            jest.advanceTimersByTime(2000);

            expect(await adapter.get('key1')).toBeNull();
            expect(await adapter.get('key2')).toBe('value2');
        });

        it('should run cleanup periodically', async () => {
            await adapter.set('key1', 'value1', 1);

            jest.advanceTimersByTime(61000);

            expect(await adapter.get('key1')).toBeNull();
        });
    });
});
