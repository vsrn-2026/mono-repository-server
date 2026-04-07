import { HealthController } from '../../controllers/health.controller';
import getVersionInfo from '../../utils/version';

jest.mock('../../utils/version');

describe('HealthController', () => {
    let controller: HealthController;

    beforeEach(() => {
        controller = new HealthController();
        jest.clearAllMocks();
    });

    describe('getHealth', () => {
        it('should return health status with version info', async () => {
            const mockVersionInfo = {
                version: '1.0.0',
                commit: 'abc123',
                buildTime: '2024-01-01T00:00:00.000Z',
            };
            (getVersionInfo as jest.Mock).mockReturnValue(mockVersionInfo);

            const result = await controller.getHealth();

            expect(result.status).toBe('UP');
            expect(result.timestamp).toBeDefined();
            expect(result.uptime).toBeGreaterThanOrEqual(0);
            expect(result.version).toBe('1.0.0');
            expect(result.commit).toBe('abc123');
        });

        it('should return valid ISO timestamp', async () => {
            (getVersionInfo as jest.Mock).mockReturnValue({ version: 'unknown', commit: 'dev', buildTime: new Date().toISOString() });

            const result = await controller.getHealth();

            expect(() => new Date(result.timestamp)).not.toThrow();
            expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
        });
    });

    describe('getRoot', () => {
        it('should return server running message', async () => {
            const result = await controller.getRoot();

            expect(result).toBe('mono-server Backend Server is running!');
        });
    });
});
