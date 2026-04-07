 
import logger from './logger';

interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
}

export const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> => {
    const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, factor = 2 } = options;
  
    let lastError: Error;
  
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
      
            if (attempt === maxRetries) break;
      
            const delay = Math.min(initialDelay * Math.pow(factor, attempt), maxDelay);
            logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      
            await new Promise<void>(resolve => setTimeout(resolve, delay));
        }
    }
  
    throw lastError!;
};
