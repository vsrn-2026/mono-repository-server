import { checkLockout, incrementFailedAttempts, resetFailedAttempts, getRemainingLockoutTime } from '../../utils/lockout';
import { redisClient } from '../../middleware/rateLimiter';

jest.mock('../../middleware/rateLimiter', () => ({
    redisClient: {
        get: jest.fn(),
        incr: jest.fn(),
        expire: jest.fn(),
        del: jest.fn(),
        ttl: jest.fn(),
    },
}));

describe('Account Lockout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkLockout', () => {
        it('should return false when no failed attempts', async () => {
            (redisClient.get as jest.Mock).mockResolvedValue(null);

            const result = await checkLockout('test@example.com');

            expect(result).toBe(false);
            expect(redisClient.get).toHaveBeenCalledWith('mono-server:lockout:test@example.com');
        });

        it('should return false when attempts below threshold', async () => {
            (redisClient.get as jest.Mock).mockResolvedValue('3');

            const result = await checkLockout('test@example.com');

            expect(result).toBe(false);
        });

        it('should return true when attempts reach threshold', async () => {
            (redisClient.get as jest.Mock).mockResolvedValue('5');

            const result = await checkLockout('test@example.com');

            expect(result).toBe(true);
        });

        it('should return true when attempts exceed threshold', async () => {
            (redisClient.get as jest.Mock).mockResolvedValue('10');

            const result = await checkLockout('test@example.com');

            expect(result).toBe(true);
        });
    });

    describe('incrementFailedAttempts', () => {
        it('should increment and set expiry on first attempt', async () => {
            (redisClient.incr as jest.Mock).mockResolvedValue(1);
            (redisClient.expire as jest.Mock).mockResolvedValue(1);

            const attempts = await incrementFailedAttempts('test@example.com');

            expect(attempts).toBe(1);
            expect(redisClient.incr).toHaveBeenCalledWith('mono-server:lockout:test@example.com');
            expect(redisClient.expire).toHaveBeenCalledWith('mono-server:lockout:test@example.com', 900);
        });

        it('should increment without setting expiry on subsequent attempts', async () => {
            (redisClient.incr as jest.Mock).mockResolvedValue(3);

            const attempts = await incrementFailedAttempts('test@example.com');

            expect(attempts).toBe(3);
            expect(redisClient.expire).not.toHaveBeenCalled();
        });

        it('should track multiple failed attempts', async () => {
            (redisClient.incr as jest.Mock)
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3);
            (redisClient.expire as jest.Mock).mockResolvedValue(1);

            await incrementFailedAttempts('test@example.com');
            await incrementFailedAttempts('test@example.com');
            const attempts = await incrementFailedAttempts('test@example.com');

            expect(attempts).toBe(3);
        });
    });

    describe('resetFailedAttempts', () => {
        it('should delete lockout key', async () => {
            (redisClient.del as jest.Mock).mockResolvedValue(1);

            await resetFailedAttempts('test@example.com');

            expect(redisClient.del).toHaveBeenCalledWith('mono-server:lockout:test@example.com');
        });

        it('should not throw if key does not exist', async () => {
            (redisClient.del as jest.Mock).mockResolvedValue(0);

            await expect(resetFailedAttempts('test@example.com')).resolves.not.toThrow();
        });
    });

    describe('getRemainingLockoutTime', () => {
        it('should return remaining TTL', async () => {
            (redisClient.ttl as jest.Mock).mockResolvedValue(600);

            const ttl = await getRemainingLockoutTime('test@example.com');

            expect(ttl).toBe(600);
            expect(redisClient.ttl).toHaveBeenCalledWith('mono-server:lockout:test@example.com');
        });

        it('should return -1 when key does not exist', async () => {
            (redisClient.ttl as jest.Mock).mockResolvedValue(-2);

            const ttl = await getRemainingLockoutTime('test@example.com');

            expect(ttl).toBe(-2);
        });

        it('should return -1 when key has no expiry', async () => {
            (redisClient.ttl as jest.Mock).mockResolvedValue(-1);

            const ttl = await getRemainingLockoutTime('test@example.com');

            expect(ttl).toBe(-1);
        });
    });

    describe('lockout workflow', () => {
        it('should lock account after 5 failed attempts', async () => {
            (redisClient.incr as jest.Mock)
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(3)
                .mockResolvedValueOnce(4)
                .mockResolvedValueOnce(5);
            (redisClient.expire as jest.Mock).mockResolvedValue(1);
            (redisClient.get as jest.Mock).mockResolvedValue('5');

            for (let i = 0; i < 5; i++) {
                await incrementFailedAttempts('test@example.com');
            }

            const isLocked = await checkLockout('test@example.com');
            expect(isLocked).toBe(true);
        });

        it('should unlock after successful login', async () => {
            (redisClient.get as jest.Mock).mockResolvedValue('3');
            (redisClient.del as jest.Mock).mockResolvedValue(1);

            await resetFailedAttempts('test@example.com');

            (redisClient.get as jest.Mock).mockResolvedValue(null);
            const isLocked = await checkLockout('test@example.com');

            expect(isLocked).toBe(false);
        });
    });
});
