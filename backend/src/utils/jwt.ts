import jwt from 'jsonwebtoken';

export interface JwtPayload {
    sub: string;
    iat?: number;
    exp?: number;
}

function getEnv(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
}

export function signAccessToken(userId: string): string {
    return jwt.sign(
        { sub: userId },
        getEnv('JWT_ACCESS_SECRET'),
        { expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '15m' }
    );
}

export function signRefreshToken(userId: string): string {
    return jwt.sign(
        { sub: userId },
        getEnv('JWT_REFRESH_SECRET'),
        { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '7d' }
    );
}

export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, getEnv('JWT_ACCESS_SECRET')) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, getEnv('JWT_REFRESH_SECRET')) as JwtPayload;
}
