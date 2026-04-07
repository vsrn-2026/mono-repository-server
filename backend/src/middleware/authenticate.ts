import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export async function expressAuthentication(
    req: Request,
    securityName: string,
    _scopes?: string[]
): Promise<{ id: string }> {
    if (securityName !== 'bearerAuth') {
        return Promise.reject(new Error(`Unknown security scheme: ${securityName}`));
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return Promise.reject(Object.assign(new Error('Missing or malformed Authorization header'), { status: 401 }));
    }

    const token = authHeader.slice(7);
    try {
        const payload = verifyAccessToken(token);
        return { id: payload.sub };
    } catch {
        return Promise.reject(Object.assign(new Error('Invalid or expired access token'), { status: 401 }));
    }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ status: 'error', statusCode: 401, message: 'Missing or malformed Authorization header' });
        return;
    }

    const token = authHeader.slice(7);
    try {
        const payload = verifyAccessToken(token);
        (req as Request & { user: { id: string } }).user = { id: payload.sub };
        next();
    } catch {
        res.status(401).json({ status: 'error', statusCode: 401, message: 'Invalid or expired access token' });
    }
}
