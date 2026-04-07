import { expressAuthentication } from '../../middleware/authenticate';
import * as jwt from '../../utils/jwt';

jest.mock('../../utils/jwt');

describe('Authentication Middleware', () => {
    let mockReq: any;

    beforeEach(() => {
        mockReq = {
            headers: {},
        };
        jest.clearAllMocks();
    });

    describe('expressAuthentication', () => {
        it('should authenticate valid bearer token', async () => {
            mockReq.headers.authorization = 'Bearer validToken';
            (jwt.verifyAccessToken as jest.Mock).mockReturnValue({ sub: 'user123' });

            const result = await expressAuthentication(mockReq, 'bearerAuth');

            expect(result).toEqual({ id: 'user123' });
            expect(jwt.verifyAccessToken).toHaveBeenCalledWith('validToken');
        });

        it('should reject unknown security scheme', async () => {
            await expect(
                expressAuthentication(mockReq, 'unknownScheme')
            ).rejects.toThrow('Unknown security scheme');
        });

        it('should reject missing authorization header', async () => {
            await expect(
                expressAuthentication(mockReq, 'bearerAuth')
            ).rejects.toMatchObject({
                message: 'Missing or malformed Authorization header',
                status: 401,
            });
        });

        it('should reject malformed authorization header', async () => {
            mockReq.headers.authorization = 'InvalidFormat token';

            await expect(
                expressAuthentication(mockReq, 'bearerAuth')
            ).rejects.toMatchObject({
                message: 'Missing or malformed Authorization header',
                status: 401,
            });
        });

        it('should reject invalid token', async () => {
            mockReq.headers.authorization = 'Bearer invalidToken';
            (jwt.verifyAccessToken as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(
                expressAuthentication(mockReq, 'bearerAuth')
            ).rejects.toMatchObject({
                message: 'Invalid or expired access token',
                status: 401,
            });
        });

        it('should reject expired token', async () => {
            mockReq.headers.authorization = 'Bearer expiredToken';
            (jwt.verifyAccessToken as jest.Mock).mockImplementation(() => {
                throw new Error('Token expired');
            });

            await expect(
                expressAuthentication(mockReq, 'bearerAuth')
            ).rejects.toMatchObject({
                message: 'Invalid or expired access token',
                status: 401,
            });
        });

        it('should handle bearer token with extra spaces', async () => {
            mockReq.headers.authorization = 'Bearer  tokenWithSpaces';
            (jwt.verifyAccessToken as jest.Mock).mockReturnValue({ sub: 'user123' });

            const result = await expressAuthentication(mockReq, 'bearerAuth');

            expect(result).toEqual({ id: 'user123' });
        });
    });
});
