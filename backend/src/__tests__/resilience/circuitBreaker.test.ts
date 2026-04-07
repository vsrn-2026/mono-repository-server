import { createCircuitBreaker } from '../../utils/circuitBreaker';

describe('Circuit Breaker', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should execute function successfully when closed', async () => {
        const mockFn = jest.fn().mockResolvedValue('success');
        const breaker = createCircuitBreaker(mockFn, 'test-breaker');

        const result = await breaker.fire();

        expect(result).toBe('success');
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to wrapped function', async () => {
        const mockFn = jest.fn((a: number, b: number) => Promise.resolve(a + b));
        const breaker = createCircuitBreaker(mockFn, 'test-breaker');

        const result = await breaker.fire(5, 3);

        expect(result).toBe(8);
        expect(mockFn).toHaveBeenCalledWith(5, 3);
    });

    it('should reject when function times out', async () => {
        const mockFn = jest.fn(() => new Promise(resolve => setTimeout(resolve, 5000)));
        const breaker = createCircuitBreaker(mockFn, 'test-breaker', { timeout: 100 });

        await expect(breaker.fire()).rejects.toThrow();
    });

    it('should open circuit after error threshold', async () => {
        const mockFn = jest.fn(() => {
            return Promise.reject(new Error('Service unavailable'));
        });

        const breaker = createCircuitBreaker(mockFn, 'test-breaker', {
            errorThresholdPercentage: 50,
            resetTimeout: 1000,
        });

        for (let i = 0; i < 5; i++) {
            try {
                await breaker.fire();
            } catch {
                // Expected to fail
            }
        }

        expect(breaker.opened).toBe(true);
    });

    it('should use custom timeout option', async () => {
        const mockFn = jest.fn(() => new Promise(resolve => setTimeout(resolve, 2000)));
        const breaker = createCircuitBreaker(mockFn, 'test-breaker', { timeout: 500 });

        await expect(breaker.fire()).rejects.toThrow();
    });

    it('should use custom error threshold', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
        const breaker = createCircuitBreaker(mockFn, 'test-breaker', {
            errorThresholdPercentage: 100,
        });

        try {
            await breaker.fire();
        } catch {
            // Expected
        }

        expect(breaker.opened).toBe(false);
    });

    it('should handle successful calls after failures', async () => {
        let callCount = 0;
        const mockFn = jest.fn(() => {
            callCount++;
            if (callCount <= 2) {
                return Promise.reject(new Error('fail'));
            }
            return Promise.resolve('success');
        });

        const breaker = createCircuitBreaker(mockFn, 'test-breaker');

        try {
            await breaker.fire();
        } catch {
            // Expected
        }

        try {
            await breaker.fire();
        } catch {
            // Expected
        }

        const result = await breaker.fire();
        expect(result).toBe('success');
    });
});
