import { verifyAccessToken, verifyRefreshToken, signAccessToken, signRefreshToken } from '../../utils/jwt';
import jwt from 'jsonwebtoken';

describe('JWT Utils', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            JWT_ACCESS_SECRET: 'test-access-secret',
            JWT_REFRESH_SECRET: 'test-refresh-secret',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('signAccessToken', () => {
        it('should generate a valid access token', () => {
            const token = signAccessToken('user123');
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            const decoded = jwt.decode(token) as any;
            expect(decoded.sub).toBe('user123');
        });

        it('should throw error when JWT_ACCESS_SECRET is missing', () => {
            delete process.env.JWT_ACCESS_SECRET;

            expect(() => signAccessToken('user123')).toThrow('Missing required environment variable');
        });
    });

    describe('signRefreshToken', () => {
        it('should generate a valid refresh token', () => {
            const token = signRefreshToken('user123');
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            const decoded = jwt.decode(token) as any;
            expect(decoded.sub).toBe('user123');
        });

        it('should throw error when JWT_REFRESH_SECRET is missing', () => {
            delete process.env.JWT_REFRESH_SECRET;

            expect(() => signRefreshToken('user123')).toThrow('Missing required environment variable');
        });
    });

    describe('verifyAccessToken', () => {
        it('should verify a valid access token', () => {
            const token = signAccessToken('user123');
            const payload = verifyAccessToken(token);

            expect(payload.sub).toBe('user123');
            expect(payload.iat).toBeDefined();
            expect(payload.exp).toBeDefined();
        });

        it('should reject an invalid token', () => {
            expect(() => verifyAccessToken('invalid-token')).toThrow();
        });

        it('should reject token signed with wrong secret', () => {
            const token = jwt.sign({ sub: 'user123' }, 'wrong-secret');
            expect(() => verifyAccessToken(token)).toThrow();
        });
    });

    describe('verifyRefreshToken', () => {
        it('should verify a valid refresh token', () => {
            const token = signRefreshToken('user123');
            const payload = verifyRefreshToken(token);

            expect(payload.sub).toBe('user123');
            expect(payload.iat).toBeDefined();
            expect(payload.exp).toBeDefined();
        });

        it('should reject an invalid token', () => {
            expect(() => verifyRefreshToken('invalid-token')).toThrow();
        });

        it('should reject token signed with wrong secret', () => {
            const token = jwt.sign({ sub: 'user123' }, 'wrong-secret');
            expect(() => verifyRefreshToken(token)).toThrow();
        });
    });
});
