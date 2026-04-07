import { retryWithBackoff } from '../../utils/retry';

describe('Retry with Backoff', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
        const mockFn = jest.fn().mockResolvedValue('success');

        const promise = retryWithBackoff(mockFn);
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
        let attempts = 0;
        const mockFn = jest.fn(() => {
            attempts++;
            if (attempts < 3) {
                return Promise.reject(new Error('Temporary failure'));
            }
            return Promise.resolve('success');
        });

        const promise = retryWithBackoff(mockFn, { maxRetries: 3 });
        await jest.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

        const promise = retryWithBackoff(mockFn, { maxRetries: 2 });

        await expect(async () => {
            await jest.runAllTimersAsync();
            await promise;
        }).rejects.toThrow('Persistent failure');

        expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff delays', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
        const delays: number[] = [];

        const promise = retryWithBackoff(mockFn, {
            maxRetries: 3,
            initialDelay: 1000,
            factor: 2,
        });

        // Track delays
        const originalSetTimeout = global.setTimeout;
        jest.spyOn(global, 'setTimeout').mockImplementation(((callback: any, delay: number) => {
            if (delay) delays.push(delay);
            return originalSetTimeout(callback, 0);
        }) as any);

        try {
            await jest.runAllTimersAsync();
            await promise;
        } catch {
            // Expected to fail
        }

        expect(delays).toEqual([1000, 2000, 4000]);
    });

    it('should respect max delay cap', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
        const delays: number[] = [];

        const promise = retryWithBackoff(mockFn, {
            maxRetries: 3,
            initialDelay: 5000,
            maxDelay: 8000,
            factor: 2,
        });

        const originalSetTimeout = global.setTimeout;
        jest.spyOn(global, 'setTimeout').mockImplementation(((callback: any, delay: number) => {
            if (delay) delays.push(delay);
            return originalSetTimeout(callback, 0);
        }) as any);

        try {
            await jest.runAllTimersAsync();
            await promise;
        } catch {
            // Expected
        }

        expect(delays[0]).toBe(5000);
        expect(delays[1]).toBeLessThanOrEqual(8000);
        expect(delays[2]).toBeLessThanOrEqual(8000);
    });

    it('should use default options when not provided', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('fail'));

        const promise = retryWithBackoff(mockFn);

        try {
            await jest.runAllTimersAsync();
            await promise;
        } catch {
            // Expected
        }

        expect(mockFn).toHaveBeenCalledTimes(4); // Initial + 3 default retries
    });

    it('should handle async function errors', async () => {
        const mockFn = jest.fn(async () => {
            throw new Error('Async error');
        });

        const promise = retryWithBackoff(mockFn, { maxRetries: 1 });

        await expect(async () => {
            await jest.runAllTimersAsync();
            await promise;
        }).rejects.toThrow('Async error');
    });
});
