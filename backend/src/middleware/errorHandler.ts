import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface AppError extends Error {
    statusCode?: number;
    errors?: unknown;
}

const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    if (statusCode >= 500) {
        logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled server error');
    } else {
        logger.warn({ message, url: req.originalUrl, method: req.method, statusCode }, 'Request error');
    }

    return res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        errors: err.errors || undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

export default errorHandler;
