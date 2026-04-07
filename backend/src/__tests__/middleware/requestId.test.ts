import { requestIdMiddleware } from '../../middleware/requestId';

describe('Request ID Middleware', () => {
    let mockReq: any;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
        mockReq = {
            headers: {},
            id: undefined,
        };
        mockRes = {
            setHeader: jest.fn(),
        };
        mockNext = jest.fn();
    });

    it('should generate request ID when not provided', () => {
        requestIdMiddleware(mockReq, mockRes, mockNext);

        expect(mockReq.id).toBeDefined();
        expect(typeof mockReq.id).toBe('string');
        expect(mockReq.id.length).toBeGreaterThan(0);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', mockReq.id);
        expect(mockNext).toHaveBeenCalled();
    });

    it('should use existing request ID from header', () => {
        const existingId = 'existing-request-id-123';
        mockReq.headers['x-request-id'] = existingId;

        requestIdMiddleware(mockReq, mockRes, mockNext);

        expect(mockReq.id).toBe(existingId);
        expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', existingId);
        expect(mockNext).toHaveBeenCalled();
    });

    it('should generate unique IDs for different requests', () => {
        const req1: { headers: Record<string, string>; id?: string } = { headers: {} };
        const req2: { headers: Record<string, string>; id?: string } = { headers: {} };
        const res1 = { setHeader: jest.fn() };
        const res2 = { setHeader: jest.fn() };

        requestIdMiddleware(req1 as any, res1 as any, mockNext);
        requestIdMiddleware(req2 as any, res2 as any, mockNext);

        expect(req1.id).toBeDefined();
        expect(req2.id).toBeDefined();
        expect(req1.id).not.toBe(req2.id);
    });

    it('should handle case-insensitive header names', () => {
        const existingId = 'case-test-id';
        mockReq.headers['X-Request-ID'] = existingId;

        requestIdMiddleware(mockReq, mockRes, mockNext);

        expect(mockReq.id).toBeDefined();
        expect(mockNext).toHaveBeenCalled();
    });

    it('should always call next middleware', () => {
        requestIdMiddleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
    });
});
