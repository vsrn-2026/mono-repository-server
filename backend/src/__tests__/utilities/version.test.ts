import getVersionInfo from '../../utils/version';

describe('Version Utils', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should return version info from environment variables', () => {
        process.env.COMMIT_HASH = 'abc123def';
        process.env.BUILD_TIME = '2024-03-11T00:00:00.000Z';

        const info = getVersionInfo();

        expect(typeof info.version).toBe('string');
        expect(info.commit).toBe('abc123def');
        expect(info.buildTime).toBe('2024-03-11T00:00:00.000Z');
    });

    it('should return default values when env vars not set', () => {
        delete process.env.COMMIT_HASH;
        delete process.env.BUILD_TIME;

        const info = getVersionInfo();

        expect(typeof info.version).toBe('string');
        expect(info.commit).toBe('dev');
        expect(typeof info.buildTime).toBe('string');
        expect(() => new Date(info.buildTime)).not.toThrow();
    });

    it('should handle partial environment variables', () => {
        process.env.COMMIT_HASH = 'partial123';
        delete process.env.BUILD_TIME;

        const info = getVersionInfo();

        expect(info.commit).toBe('partial123');
        expect(typeof info.buildTime).toBe('string');
    });

    it('should return object with correct structure', () => {
        const info = getVersionInfo();

        expect(info).toHaveProperty('version');
        expect(info).toHaveProperty('commit');
        expect(info).toHaveProperty('buildTime');
    });
});
