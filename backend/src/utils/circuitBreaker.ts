import CircuitBreaker from 'opossum';
import logger from './logger';

interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    volumeThreshold?: number;
}

export const createCircuitBreaker = <T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    name: string,
    options: CircuitBreakerOptions = {}
): CircuitBreaker<T, R> => {
    const breaker = new CircuitBreaker(fn, {
        timeout: options.timeout || 3000,
        errorThresholdPercentage: options.errorThresholdPercentage || 50,
        resetTimeout: options.resetTimeout || 30000,
        volumeThreshold: options.volumeThreshold || 10,
    });

    breaker.on('open', () => logger.warn(`Circuit breaker opened: ${name}`));
    breaker.on('halfOpen', () => logger.info(`Circuit breaker half-open: ${name}`));
    breaker.on('close', () => logger.info(`Circuit breaker closed: ${name}`));

    return breaker;
};
