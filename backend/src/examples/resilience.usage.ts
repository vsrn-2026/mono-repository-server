/* eslint-disable no-undef, no-useless-catch */
/**
 * Usage Examples for Resilience Utilities
 * 
 * This file demonstrates how to use:
 * - Circuit Breaker
 * - Retry with Exponential Backoff
 * - Job Queue (BullMQ)
 * - Request Correlation (automatic via middleware)
 */

import { createCircuitBreaker } from '../utils/circuitBreaker';
import { retryWithBackoff } from '../utils/retry';
import { createQueue, createWorker } from '../utils/queue';

// ============================================
// 1. Circuit Breaker Example
// ============================================

// Wrap external API calls with circuit breaker
const fetchExchangeData = async (symbol: string): Promise<unknown> => {
    const response = await fetch(`https://api.exchange.com/data/${symbol}`);
    if (!response.ok) throw new Error('Exchange API failed');
    return response.json();
};

const exchangeBreaker = createCircuitBreaker(
    fetchExchangeData,
    'exchange-api',
    { timeout: 5000, errorThresholdPercentage: 50, resetTimeout: 30000 }
);

// Usage in controller
export const getMarketData = async (symbol: string) => {
    try {
        return await exchangeBreaker.fire(symbol);
    } catch (error) {
        // Circuit is open or request failed
        throw error;
    }
};

// ============================================
// 2. Retry with Exponential Backoff Example
// ============================================

export const fetchWithRetry = async (url: string) => {
    return retryWithBackoff(
        async () => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        },
        { maxRetries: 3, initialDelay: 1000, maxDelay: 10000 }
    );
};

// ============================================
// 3. Job Queue Example (BullMQ)
// ============================================

// Create queue
const dataPollingQueue = createQueue('data-polling');

// Add job to queue
export const scheduleDataPolling = async (symbol: string) => {
    await dataPollingQueue.add('poll-exchange', { symbol }, {
        repeat: { every: 60000 }, // Every 60 seconds
        removeOnComplete: true,
    });
};

// Create worker to process jobs
interface PollingJobData {
    symbol: string;
}

createWorker<PollingJobData>('data-polling', async (job) => {
    const { symbol } = job.data;
    const data = await fetchExchangeData(symbol);
    // Process and store data
    console.log('Polled data for', symbol, data);
});

// ============================================
// 4. Request Correlation (Automatic)
// ============================================

// In controllers, use req.log instead of logger
// Example:
// req.log.info({ userId: req.userId }, 'User action');
// All logs will automatically include requestId
