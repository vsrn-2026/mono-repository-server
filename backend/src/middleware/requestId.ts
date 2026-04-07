import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import logger from '../utils/logger';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string || randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any).log = logger.child({ requestId });

    next();
};
