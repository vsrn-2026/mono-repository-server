import fs from 'fs';
import path from 'path';
import logger from './logger';

interface VersionInfo {
    version: string;
    commit: string;
    buildTime: string;
}

const getVersionInfo = (): VersionInfo => {
    let version = 'unknown';
    try {
        const packageJsonPath = path.resolve(process.cwd(), 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        version = packageJson.version;
    } catch {
        logger.error('Version Fallback not handled'); //TODO: Fallback or log error
    }

    return {
        version,
        commit: process.env.COMMIT_HASH || 'dev',
        buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    };
};

export default getVersionInfo;
