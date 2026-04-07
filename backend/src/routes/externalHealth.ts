import { Router } from 'express';
import logger from '../utils/logger';

const router = Router();

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        [key: string]: { status: 'up' | 'down'; latency?: number; error?: string };
    };
}

router.get('/external-health', async (req, res) => {
    const checks: HealthStatus['checks'] = {};
    let overallStatus: HealthStatus['status'] = 'healthy';

    //TODO: Remove or use input method to add External APIs if needed
    const externalAPIs = [
        { name: 'binance', url: 'https://api.binance.com/api/v3/ping' },
        { name: 'bybit', url: 'https://api.bybit.com/v5/market/time' },
    ];

    await Promise.all(
        externalAPIs.map(async (api) => {
            const start = Date.now();
            try {
                // eslint-disable-next-line no-undef
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                // eslint-disable-next-line no-undef
                await fetch(api.url, { signal: controller.signal });
                clearTimeout(timeout);
                checks[api.name] = { status: 'up', latency: Date.now() - start };
            } catch (error) {
                checks[api.name] = { status: 'down', error: (error as Error).message };
                overallStatus = overallStatus === 'healthy' ? 'degraded' : 'unhealthy';
                logger.warn({ api: api.name, error }, 'External API health check failed');
            }
        })
    );

    res.status(overallStatus === 'healthy' ? 200 : 503).json({ status: overallStatus, checks });
});

export default router;
