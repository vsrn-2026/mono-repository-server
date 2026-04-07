import crypto from 'crypto';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Response as ExResponse } from 'express';

export function generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(res: ExResponse, token: string): void {
    res.cookie('csrfToken', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
    });
}

const SKIP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const csrfProtection: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    if (SKIP_METHODS.has(req.method)) {
        next();
        return;
    }

    const tokenFromHeader = req.headers['x-csrf-token'] as string | undefined;
    const tokenFromCookie = req.cookies?.csrfToken as string | undefined;

    if (!tokenFromHeader || !tokenFromCookie || tokenFromHeader !== tokenFromCookie) {
        res.status(403).json({ message: 'Invalid or missing CSRF token' });
        return;
    }

    next();
};
