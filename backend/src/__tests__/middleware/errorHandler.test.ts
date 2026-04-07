import errorHandler, { AppError } from '../../middleware/errorHandler';

describe('Error Handler Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: any;

    beforeEach(() => {
        mockReq = {
            originalUrl: '/api/test',
            method: 'POST',
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });

    it('should handle errors with status code', () => {
        const error: AppError = new Error('Test error');
        error.statusCode = 400;

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            statusCode: 400,
            message: 'Test error',
            errors: undefined,
            stack: undefined,
        });
    });

    it('should default to 500 for errors without status code', () => {
        const error: AppError = new Error('Internal error');

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            statusCode: 500,
            message: 'Internal error',
            errors: undefined,
            stack: undefined,
        });
    });

    it('should include validation errors when present', () => {
        const error: AppError = new Error('Validation failed');
        error.statusCode = 422;
        error.errors = [{ field: 'email', message: 'Invalid email' }];

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            statusCode: 422,
            message: 'Validation failed',
            errors: [{ field: 'email', message: 'Invalid email' }],
            stack: undefined,
        });
    });

    it('should include stack trace in development mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const error: AppError = new Error('Dev error');
        error.statusCode = 500;

        errorHandler(error, mockReq, mockRes, mockNext);

        const jsonCall = mockRes.json.mock.calls[0][0];
        expect(jsonCall.stack).toBeDefined();

        process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const error: AppError = new Error('Prod error');
        error.statusCode = 500;

        errorHandler(error, mockReq, mockRes, mockNext);

        const jsonCall = mockRes.json.mock.calls[0][0];
        expect(jsonCall.stack).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
    });

    it('should handle errors without message', () => {
        const error: AppError = new Error();
        error.statusCode = 404;

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            statusCode: 404,
            message: '',
            errors: undefined,
            stack: undefined,
        });
    });

    it('should handle 401 unauthorized errors', () => {
        const error: AppError = new Error('Unauthorized');
        error.statusCode = 401;

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            statusCode: 401,
            message: 'Unauthorized',
            errors: undefined,
            stack: undefined,
        });
    });

    it('should handle 403 forbidden errors', () => {
        const error: AppError = new Error('Account locked');
        error.statusCode = 403;

        errorHandler(error, mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
            status: 'error',
            statusCode: 403,
            message: 'Account locked',
            errors: undefined,
            stack: undefined,
        });
    });
});
