import { AuthController } from '../../controllers/auth.controller';
import prisma from '../../utils/prisma';
import * as argon2 from 'argon2';
import * as jwt from '../../utils/jwt';
import * as lockout from '../../utils/lockout';

jest.mock('../../utils/prisma', () => ({
    default: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        refreshToken: {
            create: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
        },
    },
}));

jest.mock('argon2');
jest.mock('../../utils/jwt');
jest.mock('../../utils/lockout');

describe('AuthController', () => {
    let controller: AuthController;
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
        controller = new AuthController();
        mockRes = {
            cookie: jest.fn(),
            clearCookie: jest.fn(),
        };
        mockReq = {
            res: mockRes,
            cookies: {},
        };
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const mockUser = { id: 'user123', email: 'test@example.com', password: 'hashedPassword' };
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (argon2.hash as jest.Mock).mockResolvedValue('hashedPassword');
            (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
            (jwt.signAccessToken as jest.Mock).mockReturnValue('accessToken');
            (jwt.signRefreshToken as jest.Mock).mockReturnValue('refreshToken');
            (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

            const result = await controller.register(
                { email: 'test@example.com', password: 'Test@1234' },
                mockReq
            );

            expect(result.message).toBe('Registration successful');
            expect(result.accessToken).toBe('accessToken');
            expect(result.user.email).toBe('test@example.com');
        });

        it('should reject weak passwords', async () => {
            await expect(
                controller.register({ email: 'test@example.com', password: 'weak' }, mockReq)
            ).rejects.toThrow('Password must be at least 8 characters');
        });

        it('should reject duplicate email', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

            await expect(
                controller.register({ email: 'test@example.com', password: 'Test@1234' }, mockReq)
            ).rejects.toThrow('Email already in use');
        });

        it('should reject invalid email', async () => {
            await expect(
                controller.register({ email: 'invalid-email', password: 'Test@1234' }, mockReq)
            ).rejects.toThrow('Invalid email address');
        });
    });

    describe('login', () => {
        it('should login successfully with valid credentials', async () => {
            const mockUser = { id: 'user123', email: 'test@example.com', password: 'hashedPassword' };
            (lockout.checkLockout as jest.Mock).mockResolvedValue(false);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
            (argon2.verify as jest.Mock).mockResolvedValue(true);
            (jwt.signAccessToken as jest.Mock).mockReturnValue('accessToken');
            (jwt.signRefreshToken as jest.Mock).mockReturnValue('refreshToken');
            (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
            (lockout.resetFailedAttempts as jest.Mock).mockResolvedValue(undefined);

            const result = await controller.login(
                { email: 'test@example.com', password: 'Test@1234' },
                mockReq
            );

            expect(result.message).toBe('Login successful');
            expect(result.accessToken).toBe('accessToken');
            expect(lockout.resetFailedAttempts).toHaveBeenCalled();
        });

        it('should reject login when account is locked', async () => {
            (lockout.checkLockout as jest.Mock).mockResolvedValue(true);

            await expect(
                controller.login({ email: 'test@example.com', password: 'Test@1234' }, mockReq)
            ).rejects.toThrow('Account locked');
        });

        it('should increment failed attempts on invalid password', async () => {
            (lockout.checkLockout as jest.Mock).mockResolvedValue(false);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user123', password: 'hashedPassword' });
            (argon2.verify as jest.Mock).mockResolvedValue(false);
            (lockout.incrementFailedAttempts as jest.Mock).mockResolvedValue(1);

            await expect(
                controller.login({ email: 'test@example.com', password: 'WrongPassword' }, mockReq)
            ).rejects.toThrow('Invalid email or password');

            expect(lockout.incrementFailedAttempts).toHaveBeenCalledWith('test@example.com');
        });

        it('should increment failed attempts on non-existent user', async () => {
            (lockout.checkLockout as jest.Mock).mockResolvedValue(false);
            (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
            (lockout.incrementFailedAttempts as jest.Mock).mockResolvedValue(1);

            await expect(
                controller.login({ email: 'nonexistent@example.com', password: 'Test@1234' }, mockReq)
            ).rejects.toThrow('Invalid email or password');

            expect(lockout.incrementFailedAttempts).toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('should refresh tokens successfully', async () => {
            mockReq.cookies.refreshToken = 'validRefreshToken';
            const mockPayload = { sub: 'user123' };
            const mockStoredToken = { tokenHash: 'hashedToken', userId: 'user123', expiresAt: new Date(Date.now() + 10000) };

            (jwt.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
            (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockStoredToken);
            (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
            (jwt.signAccessToken as jest.Mock).mockReturnValue('newAccessToken');
            (jwt.signRefreshToken as jest.Mock).mockReturnValue('newRefreshToken');
            (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

            const result = await controller.refresh(mockReq);

            expect(result.accessToken).toBe('newAccessToken');
            expect(prisma.refreshToken.delete).toHaveBeenCalled();
            expect(prisma.refreshToken.create).toHaveBeenCalled();
        });

        it('should reject when refresh token is missing', async () => {
            mockReq.cookies = {};

            await expect(controller.refresh(mockReq)).rejects.toThrow('Refresh token not found');
        });

        it('should reject expired refresh token', async () => {
            mockReq.cookies.refreshToken = 'expiredToken';
            (jwt.verifyRefreshToken as jest.Mock).mockImplementation(() => {
                throw new Error('Token expired');
            });

            await expect(controller.refresh(mockReq)).rejects.toThrow('Invalid or expired refresh token');
            expect(mockRes.clearCookie).toHaveBeenCalled();
        });

        it('should reject when token not found in database', async () => {
            mockReq.cookies.refreshToken = 'validToken';
            (jwt.verifyRefreshToken as jest.Mock).mockReturnValue({ sub: 'user123' });
            (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(controller.refresh(mockReq)).rejects.toThrow('Invalid or expired refresh token');
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            mockReq.cookies.refreshToken = 'validToken';
            (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({});

            const result = await controller.logout(mockReq);

            expect(result.message).toBe('Logged out successfully');
            expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
            expect(mockRes.clearCookie).toHaveBeenCalled();
        });

        it('should logout even without refresh token', async () => {
            mockReq.cookies = {};

            const result = await controller.logout(mockReq);

            expect(result.message).toBe('Logged out successfully');
            expect(mockRes.clearCookie).toHaveBeenCalled();
        });
    });
});
