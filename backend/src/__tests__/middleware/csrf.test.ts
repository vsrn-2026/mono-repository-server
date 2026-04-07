import { generateCsrfToken, setCsrfCookie, csrfProtection } from '../../middleware/csrf';
import { Request, Response, NextFunction } from 'express';

describe('CSRF Middleware', () => {
    describe('generateCsrfToken', () => {
        it('should return a 64-char hex string', () => {
            const token = generateCsrfToken();
            expect(token).toHaveLength(64);
            expect(/^[0-9a-f]+$/.test(token)).toBe(true);
        });

        it('should return unique tokens on each call', () => {
            const t1 = generateCsrfToken();
            const t2 = generateCsrfToken();
            expect(t1).not.toBe(t2);
        });
    });

    describe('setCsrfCookie', () => {
        it('should set a non-HttpOnly, SameSite=Strict cookie', () => {
            const cookieMock = jest.fn();
            const res = { cookie: cookieMock } as unknown as Response;

            setCsrfCookie(res, 'testtoken');

            expect(cookieMock).toHaveBeenCalledWith('csrfToken', 'testtoken', expect.objectContaining({
                httpOnly: false,
                sameSite: 'strict',
                path: '/api/auth',
            }));
        });
    });

    describe('csrfProtection', () => {
        let req: Partial<Request>;
        let res: Partial<Response>;
        let next: NextFunction;
        let jsonMock: jest.Mock;
        let statusMock: jest.Mock;

        beforeEach(() => {
            jsonMock = jest.fn();
            statusMock = jest.fn().mockReturnValue({ json: jsonMock });
            next = jest.fn();
            req = { method: 'POST', headers: {}, cookies: {} };
            res = { status: statusMock, json: jsonMock } as unknown as Partial<Response>;
        });

        it('should call next for GET requests', () => {
            req.method = 'GET';
            csrfProtection(req as Request, res as Response, next);
            expect(next).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });

        it('should call next for HEAD requests', () => {
            req.method = 'HEAD';
            csrfProtection(req as Request, res as Response, next);
            expect(next).toHaveBeenCalled();
        });

        it('should call next for OPTIONS requests', () => {
            req.method = 'OPTIONS';
            csrfProtection(req as Request, res as Response, next);
            expect(next).toHaveBeenCalled();
        });

        it('should call next when header matches cookie', () => {
            req.headers = { 'x-csrf-token': 'abc123' };
            req.cookies = { csrfToken: 'abc123' };
            csrfProtection(req as Request, res as Response, next);
            expect(next).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });

        it('should return 403 when header is missing', () => {
            req.headers = {};
            req.cookies = { csrfToken: 'abc123' };
            csrfProtection(req as Request, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 403 when cookie is missing', () => {
            req.headers = { 'x-csrf-token': 'abc123' };
            req.cookies = {};
            csrfProtection(req as Request, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 403 when header does not match cookie', () => {
            req.headers = { 'x-csrf-token': 'wrong' };
            req.cookies = { csrfToken: 'abc123' };
            csrfProtection(req as Request, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
});
