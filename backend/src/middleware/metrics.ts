import { Request, Response, NextFunction } from 'express';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import logger from '../utils/logger';

const register = new Registry();

collectDefaultMetrics({ register });

export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

export const httpRequestTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

export const httpErrorsTotal = new Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

export const cacheHitTotal = new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type'],
    registers: [register]
});

export const cacheMissTotal = new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type'],
    registers: [register]
});

export const queueDepth = new Gauge({
    name: 'queue_depth',
    help: 'Current depth of job queue',
    labelNames: ['queue_name'],
    registers: [register]
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route?.path || req.path;
        const statusCode = res.statusCode.toString();

        httpRequestDuration.labels(req.method, route, statusCode).observe(duration);
        httpRequestTotal.labels(req.method, route, statusCode).inc();

        if (res.statusCode >= 400) {
            httpErrorsTotal.labels(req.method, route, statusCode).inc();
        }
    });

    next();
};

export const metricsHandler = async (req: Request, res: Response) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        logger.error({ err }, 'Failed to collect metrics');
        res.status(500).end();
    }
};

export { register };
