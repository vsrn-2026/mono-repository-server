import crypto from 'crypto';
import argon2 from 'argon2';
import validator from 'validator';
import {
    Controller,
    Post,
    Route,
    Body,
    Tags,
    SuccessResponse,
    Response as TsoaResponse,
    Request,
    Security,
} from 'tsoa';
import { Request as ExRequest, Response as ExResponse } from 'express';
import logger from '../utils/logger';
import prisma from '../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authRateLimiter } from '../middleware/rateLimiter';
import { checkLockout, incrementFailedAttempts, resetFailedAttempts } from '../utils/lockout';
import { generateCsrfToken, setCsrfCookie } from '../middleware/csrf';
import { Middlewares } from 'tsoa';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
}

function refreshTokenExpiresAt(): Date {
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid JWT_REFRESH_EXPIRES_IN format. Use e.g. "7d", "24h".');
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const msMap: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return new Date(Date.now() + value * msMap[unit]);
}

function setRefreshCookie(res: ExResponse, token: string): void {
    const maxAgeMs = refreshTokenExpiresAt().getTime() - Date.now();
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: maxAgeMs,
        path: '/api/auth',
    });
}

function clearRefreshCookie(res: ExResponse): void {
    res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', path: '/api/auth' });
}

// ─── Request / Response shapes ────────────────────────────────────────────────

export interface RegisterInput {
    email: string;
    password: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface UserResponse {
    id: string;
    email: string;
}

export interface AuthResponse {
    message: string;
    accessToken: string;
    user: UserResponse;
}

export interface RefreshResponse {
    accessToken: string;
}

export interface MessageResponse {
    message: string;
}

export interface ErrorResponse {
    message: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Route('auth')
@Tags('Auth')
export class AuthController extends Controller {

    @Middlewares(authRateLimiter)
    @Post('register')
    @SuccessResponse('201', 'User registered')
    @TsoaResponse<ErrorResponse>(400, 'Validation error')
    @TsoaResponse<ErrorResponse>(409, 'Email already in use')
    public async register(
        @Body() body: RegisterInput,
        @Request() req: ExRequest,
    ): Promise<AuthResponse> {
        const res = req.res as ExResponse;
        const sanitizedEmail = validator.normalizeEmail(body.email) || body.email;

        if (!validator.isEmail(sanitizedEmail)) {
            this.setStatus(400);
            throw new Error('Invalid email address');
        }

        if (!validator.isStrongPassword(body.password, { minLength: 8, minNumbers: 1, minSymbols: 1, minUppercase: 1 })) {
            this.setStatus(400);
            throw new Error('Password must be at least 8 characters long and contain at least one number, one special character, and one uppercase letter');
        }

        const existing = await prisma.user.findUnique({ where: { email: sanitizedEmail } });
        if (existing) {
            this.setStatus(409);
            throw new Error('Email already in use');
        }

        const hashedPassword = await argon2.hash(body.password);
        const user = await prisma.user.create({
            data: { email: sanitizedEmail, password: hashedPassword },
        });

        logger.info({ userId: user.id }, 'User registered');

        const accessToken = signAccessToken(user.id);
        const refreshToken = signRefreshToken(user.id);

        await prisma.refreshToken.create({
            data: {
                tokenHash: hashToken(refreshToken),
                userId: user.id,
                expiresAt: refreshTokenExpiresAt(),
            },
        });

        setRefreshCookie(res, refreshToken);
        setCsrfCookie(res, generateCsrfToken());
        this.setStatus(201);

        return {
            message: 'Registration successful',
            accessToken,
            user: { id: user.id, email: user.email },
        };
    }

    @Middlewares(authRateLimiter)
    @Post('login')
    @SuccessResponse('200', 'Login successful')
    @TsoaResponse<ErrorResponse>(401, 'Invalid email or password')
    @TsoaResponse<ErrorResponse>(403, 'Account locked')
    public async login(
        @Body() body: LoginInput,
        @Request() req: ExRequest,
    ): Promise<AuthResponse> {
        const res = req.res as ExResponse;
        const sanitizedEmail = validator.normalizeEmail(body.email) || body.email;

        logger.info({ email: validator.escape(sanitizedEmail) }, 'Login attempt');

        if (await checkLockout(sanitizedEmail)) {
            this.setStatus(403);
            throw new Error('Account locked due to too many failed attempts. Please try again later.');
        }

        const user = await prisma.user.findUnique({ where: { email: sanitizedEmail } });
        if (!user || !(await argon2.verify(user.password, body.password))) {
            await incrementFailedAttempts(sanitizedEmail);
            this.setStatus(401);
            throw new Error('Invalid email or password');
        }

        await resetFailedAttempts(sanitizedEmail);

        const accessToken = signAccessToken(user.id);
        const refreshToken = signRefreshToken(user.id);

        await prisma.refreshToken.create({
            data: {
                tokenHash: hashToken(refreshToken),
                userId: user.id,
                expiresAt: refreshTokenExpiresAt(),
            },
        });

        setRefreshCookie(res, refreshToken);
        setCsrfCookie(res, generateCsrfToken());
        logger.info({ userId: user.id }, 'Login successful');

        return {
            message: 'Login successful',
            accessToken,
            user: { id: user.id, email: user.email },
        };
    }

    @Middlewares(authRateLimiter)
    @Post('refresh')
    @SuccessResponse('200', 'Tokens refreshed')
    @TsoaResponse<ErrorResponse>(401, 'Invalid or expired refresh token')
    public async refresh(
        @Request() req: ExRequest,
    ): Promise<RefreshResponse> {
        const res = req.res as ExResponse;
        const rawToken = req.cookies?.refreshToken;

        if (!rawToken) {
            this.setStatus(401);
            throw new Error('Refresh token not found');
        }

        // 1. Verify JWT signature & expiry
        let payload: { sub: string };
        try {
            payload = verifyRefreshToken(rawToken) as { sub: string };
        } catch {
            clearRefreshCookie(res);
            this.setStatus(401);
            throw new Error('Invalid or expired refresh token');
        }

        // 2. Look up the hash in the DB
        const tokenHash = hashToken(rawToken);
        const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

        if (!stored || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
            clearRefreshCookie(res);
            this.setStatus(401);
            throw new Error('Invalid or expired refresh token');
        }

        // 3. Rotate: delete old record, issue new pair
        await prisma.refreshToken.delete({ where: { tokenHash } });

        const newAccessToken = signAccessToken(payload.sub);
        const newRefreshToken = signRefreshToken(payload.sub);

        await prisma.refreshToken.create({
            data: {
                tokenHash: hashToken(newRefreshToken),
                userId: payload.sub,
                expiresAt: refreshTokenExpiresAt(),
            },
        });

        setRefreshCookie(res, newRefreshToken);
        setCsrfCookie(res, generateCsrfToken());
        logger.info({ userId: payload.sub }, 'Tokens rotated');

        return { accessToken: newAccessToken };
    }

    @Post('logout')
    @Security('bearerAuth')
    @SuccessResponse('200', 'Logged out')
    public async logout(
        @Request() req: ExRequest,
    ): Promise<MessageResponse> {
        const res = req.res as ExResponse;
        const rawToken = req.cookies?.refreshToken;

        if (rawToken) {
            const tokenHash = hashToken(rawToken);
            await prisma.refreshToken.deleteMany({ where: { tokenHash } });
        }

        clearRefreshCookie(res);
        logger.info('User logged out');

        return { message: 'Logged out successfully' };
    }
}
